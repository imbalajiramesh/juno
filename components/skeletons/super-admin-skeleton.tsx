import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SuperAdminDashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        <Skeleton className="h-8 w-80 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Organizations List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="requires_more_info">Info Required</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-4 w-full max-w-96" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="requires_more_info">
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="approved">
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Skeleton className="h-6 w-18" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="rejected">
                  <div className="space-y-4">
                    {[1].map((i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Organization Details Panel */}
        <div>
          <OrganizationDetailsSkeleton />
        </div>
      </div>
    </div>
  );
}

export function OrganizationDetailsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>

        {/* Organization Info Section */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <Skeleton className="h-4 w-40" />
          </div>
          
          <div className="space-y-3">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>

            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>

            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>

            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="space-y-4">
          <div className="border-b pb-2 flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-28" />
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-md border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 ml-3" />
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t">
          <Skeleton className="h-4 w-16" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyOrganizationDetails() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <Skeleton className="w-12 h-12 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentsSkeleton() {
  return (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 bg-gray-50 rounded-md border animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 ml-3" />
          </div>
          
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyTabContentSkeleton() {
  return (
    <div className="text-center py-12 text-gray-500">
      <Skeleton className="w-16 h-16 mx-auto mb-4 rounded-full" />
      <Skeleton className="h-4 w-48 mx-auto mb-2" />
      <Skeleton className="h-3 w-32 mx-auto" />
    </div>
  );
} 