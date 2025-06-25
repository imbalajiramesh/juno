import HeaderComponent from "@/components/header-component";

export default function leadsLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
    <>
    <HeaderComponent />
    {children}
    </>);
}