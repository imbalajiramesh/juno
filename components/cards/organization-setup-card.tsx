import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function OrganizationSetupCard() {
  console.log('OrganizationSetupCard is rendering');
  
  return (
    <Card className="border-dashed border-2 border-orange-200 bg-orange-50/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-orange-800">
          Organization Setup Required
        </CardTitle>
        <Building2 className="h-4 w-4 text-orange-600" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-orange-700">
            Complete your organization setup to unlock AI-powered CRM field suggestions tailored to your industry.
          </p>
          <div className="pt-2">
            <Link href="/organization-setup">
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 