'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  // Check if MFA is required
  if (authData.user && !authData.session) {
    // User exists but no session means MFA is required
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.find((factor: any) => factor.status === 'verified')
    
    if (totpFactor) {
      // Challenge the MFA factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      })
      
      if (challengeError) {
        return { error: challengeError.message }
      }
      
      // Redirect to MFA challenge page with the challenge ID
      redirect(`/auth/mfa-challenge?challengeId=${challengeData.id}&factorId=${totpFactor.id}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      }
    }
  })

  if (error) {
    return { error: error.message }
  }

  // If user was created successfully, also create user_account record
  if (authData.user) {
    // Note: The user_account record will be created automatically by the 
    // get-tenant.ts logic when they first log in, using the metadata we set above
    console.log('User created with metadata:', { firstName, lastName, email })
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string

  // Generate a secure reset token and store it temporarily
  const resetToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  
  // Store the reset token in your database (you'll need to create a password_resets table)
  // For now, we'll use Supabase's built-in password reset but with custom redirect
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  // If you want to use Resend instead of Supabase's email, uncomment below:
  /*
  import { sendPasswordResetEmail } from '@/lib/email';
  
  const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${resetToken}`;
  const emailResult = await sendPasswordResetEmail({
    email,
    resetLink,
    firstName: 'User' // You can get this from your user table
  });

  if (!emailResult.success) {
    return { error: 'Failed to send reset email' };
  }
  */

  return { message: 'Check your email for the password reset link!' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function enrollMFA() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp'
  })

  if (error) {
    return { error: error.message }
  }

  // Type guard to ensure we have TOTP data
  if (data.type !== 'totp') {
    return { error: 'Expected TOTP factor type' }
  }

  return { 
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id
  }
}

export async function verifyMFAEnrollment(formData: FormData) {
  const supabase = await createClient()
  
  const code = formData.get('code') as string
  const factorId = formData.get('factorId') as string

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: '', // Not needed for enrollment verification
    code
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function challengeMFA(factorId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.mfa.challenge({
    factorId
  })

  if (error) {
    return { error: error.message }
  }

  return { challengeId: data.id }
}

export async function verifyMFAChallenge(formData: FormData) {
  const supabase = await createClient()
  
  const code = formData.get('code') as string
  const challengeId = formData.get('challengeId') as string
  const factorId = formData.get('factorId') as string

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}