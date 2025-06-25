import HeaderComponent from "@/components/header-component";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
    <>
    <HeaderComponent />
    {children}
    </>);
}