import HeaderComponent from "@/components/header-component";

export default function alexLayout({
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