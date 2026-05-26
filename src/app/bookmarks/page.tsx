import { PageShell } from "@/components/layout/PageShell";
import { BookmarkList } from "@/components/bookmark/BookmarkList";
import { ImportDialog } from "@/components/bookmark/ImportDialog";

export default function BookmarksPage() {
  return (
    <PageShell title="Saved">
      <div className="px-4 py-3 flex justify-end border-b border-border">
        <ImportDialog />
      </div>
      <BookmarkList />
    </PageShell>
  );
}
