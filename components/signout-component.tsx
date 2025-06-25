'use client'

import { signout } from '@/app/actions';

const SignOutComponent = () => {
  const handleSignOut = async () => {
    await signout();
  };

  return (
    <button onClick={handleSignOut}>
      Sign Out
    </button>
  );
};

export default SignOutComponent;