import HeaderComponent from '../../components/header-component'

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <HeaderComponent />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </>
  )
} 