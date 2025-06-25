import HeaderComponent from "@/components/header-component";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
    return (
    <>
    <HeaderComponent />
    {children}
    </>);
}