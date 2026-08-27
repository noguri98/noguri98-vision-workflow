import { Button } from "@/components/ui/button"

export default function LabelPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Label Management</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 bg-card">
            <div className="font-semibold mb-2">Label {i + 1}</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Manage</span>
              <Button size="sm">Edit</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
