import { useState } from 'react';
import GroupList from './GroupList';
import GroupEditor from './GroupEditor.tsx';
import type { NotificationGroup } from '../../types/database';

export default function GroupManagement() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (group: NotificationGroup) => {
    setSelectedGroupId(group.id);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setSelectedGroupId(undefined);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setSelectedGroupId(undefined);
  };

  const handleEditorSaved = () => {
    setEditorOpen(false);
    setSelectedGroupId(undefined);
    setRefreshKey(prev => prev + 1); // Trigger GroupList refresh
  };

  return (
    <div>
      <GroupList onEdit={handleEdit} onNew={handleNew} refreshKey={refreshKey} />
      
      {editorOpen && (
        <GroupEditor
          groupId={selectedGroupId}
          onClose={handleEditorClose}
          onSaved={handleEditorSaved}
        />
      )}
    </div>
  );
}
