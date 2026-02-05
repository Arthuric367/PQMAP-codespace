import { useState, useEffect, useRef } from 'react';
import { X, Save, Eye, Plus, Trash2 } from 'lucide-react';
import { substituteVariables } from '../../services/notificationService';

interface TemplateEditorProps {
  templateId?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default_value?: string;
}

const sampleVariables = {
  event_id: 'EVT-2026-0001',
  event_type: 'Voltage Dip',
  timestamp: '2026-01-14 15:30:00',
  duration: '2.5s',
  magnitude: '85%',
  severity: 'Critical',
  location: 'Substation A - Feeder 123',
  meter_id: 'MTR-001',
  substation: 'Substation A',
  customer_count: '150',
  description: 'Voltage dip detected on main feeder',
  root_cause: 'Lightning strike'
};

export default function TemplateEditor({ templateId, onClose, onSaved }: TemplateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [dragCursorPosition, setDragCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Template fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([
    { name: 'event_type', description: 'Type of PQ event', required: true },
    { name: 'location', description: 'Event location', required: true },
    { name: 'magnitude', description: 'Event magnitude', required: false },
    { name: 'severity', description: 'Event severity level', required: false },
    { name: 'timestamp', description: 'Event timestamp', required: true },
    { name: 'duration', description: 'Event duration', required: false },
    { name: 'customer_count', description: 'Affected customers', required: false }
  ]);
  // Email-only distribution channel (hardcoded)
  const [selectedChannels] = useState<string[]>(['email']);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  // Sync editor content when switching from preview mode
  useEffect(() => {
    if (!showPreview && editorRef.current && !isEditingBody) {
      editorRef.current.innerHTML = emailBody;
    }
  }, [showPreview, emailBody, isEditingBody]);

  const loadTemplate = async () => {
    if (!templateId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Load from localStorage
      const storedTemplates = localStorage.getItem('notificationTemplates');
      if (storedTemplates) {
        const parsedTemplates = JSON.parse(storedTemplates);
        const data = parsedTemplates.find((t: any) => t.id === templateId);
        
        if (data) {
          setName(data.name);
          setCode(data.code);
          setDescription(data.description || '');
          setEmailSubject(data.email_subject || '');
          setEmailBody(data.email_body || '');
          setVariables(data.variables || []);
          setTags(data.tags || []);
        } else {
          console.error('Template not found:', templateId);
          alert('Template not found');
          onClose();
        }
      } else {
        console.error('No templates in localStorage');
        alert('No templates found in storage');
        onClose();
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Error loading template');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Template name is required');
      return;
    }
    if (!code.trim()) {
      alert('Template code is required');
      return;
    }
    if (selectedChannels.length === 0) {
      alert('Select at least one channel');
      return;
    }

    // Check if channel content exists for selected channels
    if (selectedChannels.includes('email') && (!emailSubject.trim() || !emailBody.trim())) {
      alert('Email channel requires both subject and body');
      return;
    }

    setSaving(true);

    try {
      // Load existing templates from localStorage
      const storedTemplates = localStorage.getItem('notificationTemplates');
      const templates = storedTemplates ? JSON.parse(storedTemplates) : [];

      // Check for duplicate code (excluding current template if editing)
      const isDuplicateCode = templates.some((t: any) => 
        t.code === code.trim().toUpperCase() && t.id !== templateId
      );

      if (isDuplicateCode) {
        alert('Template code already exists. Please use a different code.');
        setSaving(false);
        return;
      }

      const now = new Date().toISOString();

      if (templateId) {
        // Update existing template
        const updatedTemplates = templates.map((t: any) => {
          if (t.id === templateId) {
            return {
              ...t,
              name: name.trim(),
              code: code.trim().toUpperCase(),
              description: description.trim() || null,
              email_subject: emailSubject.trim() || null,
              email_body: emailBody.trim() || null,
              variables,
              applicable_channels: selectedChannels,
              tags,
              updated_at: now
            };
          }
          return t;
        });
        localStorage.setItem('notificationTemplates', JSON.stringify(updatedTemplates));
      } else {
        // Create new template
        const newTemplate = {
          id: `template-${Date.now()}`,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
          email_subject: emailSubject.trim() || null,
          email_body: emailBody.trim() || null,
          variables,
          applicable_channels: selectedChannels,
          tags,
          status: 'draft',
          version: 1,
          created_at: now,
          updated_at: now,
          approved_at: null
        };
        templates.push(newTemplate);
        localStorage.setItem('notificationTemplates', JSON.stringify(templates));
      }

      setSaving(false);
      onSaved();
    } catch (error: any) {
      setSaving(false);
      alert('Error saving template: ' + (error.message || 'Unknown error'));
    }
  };

  const addVariable = () => {
    setVariables([...variables, { name: '', description: '', required: false }]);
  };

  const updateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const insertVariable = (varName: string) => {
    const placeholder = `{{${varName}}}`;
    setEmailBody(emailBody + placeholder);
  };

  const handleDragStart = (e: React.DragEvent, varName: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `{{${varName}}}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Update cursor position for visual indicator
    if (editorRef.current) {
      const rect = editorRef.current.getBoundingClientRect();
      setDragCursorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleDropOnTextarea = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCursorPosition(null);
    const placeholder = e.dataTransfer.getData('text/plain');
    
    if (placeholder && editorRef.current) {
      // Focus the editor
      editorRef.current.focus();
      
      // Get the range at the drop position
      let range: Range | null = null;
      
      // Try to get the caret position at the drop point
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
      } else if ((document as any).caretPositionFromPoint) {
        // Firefox
        const caretPosition = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
        if (caretPosition) {
          range = document.createRange();
          range.setStart(caretPosition.offsetNode, caretPosition.offset);
          range.collapse(true);
        }
      }
      
      if (range) {
        // Create a text node with the placeholder
        const textNode = document.createTextNode(placeholder);
        range.insertNode(textNode);
        
        // Move cursor after the inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        // Update state
        setIsEditingBody(true);
        setEmailBody(editorRef.current.innerHTML);
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const getPreviewContent = () => {
    return {
      subject: substituteVariables(emailSubject, sampleVariables),
      body: substituteVariables(emailBody, sampleVariables)
    };
  };

  const updateFormatState = () => {
    try {
      setIsBoldActive(document.queryCommandState('bold'));
      setIsItalicActive(document.queryCommandState('italic'));
      setIsUnderlineActive(document.queryCommandState('underline'));
    } catch {
      // Ignore if browser doesn't support queryCommandState
    }
  };

  const insertTable = (rows: number, cols: number) => {
    if (editorRef.current) {
      // Focus the editor first
      editorRef.current.focus();
      
      // Wait for focus to complete, then restore range and insert
      setTimeout(() => {
        if (editorRef.current && savedRange) {
          const selection = window.getSelection();
          if (selection) {
            try {
              selection.removeAllRanges();
              selection.addRange(savedRange);
            } catch (e) {
              console.error('Error restoring range:', e);
            }
          }
        }
        
        // Generate table headers
        let headerHTML = '<tr>';
        for (let i = 1; i <= cols; i++) {
          headerHTML += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f3f4f6;">Header ${i}</th>`;
        }
        headerHTML += '</tr>';
        
        // Generate table rows
        let bodyHTML = '';
        for (let i = 0; i < rows; i++) {
          bodyHTML += '<tr>';
          for (let j = 1; j <= cols; j++) {
            bodyHTML += `<td style="border: 1px solid #ddd; padding: 8px;">Cell ${i * cols + j}</td>`;
          }
          bodyHTML += '</tr>';
        }
        
        // Combine into complete table
        const tableHTML = `<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 10px 0;"><thead>${headerHTML}</thead><tbody>${bodyHTML}</tbody></table><br>`;
        
        // Use insertHTML for reliable insertion
        document.execCommand('insertHTML', false, tableHTML);
        
        // Update state
        setIsEditingBody(true);
        if (editorRef.current) {
          setEmailBody(editorRef.current.innerHTML);
        }
        
        // Clear saved range
        setSavedRange(null);
      }, 0);
    }
  };

  const handleInsertTable = () => {
    insertTable(tableRows, tableColumns);
    setShowTableModal(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 text-center">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {templateId ? 'Edit Template' : 'New Template'}
            </h2>
            <p className="text-slate-600 mt-1">Create multi-channel notification template</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Variables Quick Selection Panel */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span>📋 Available Variables</span>
              <span className="text-sm font-normal text-slate-600">(Drag to template body)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, variable.name)}
                  className="px-3 py-2 bg-white border border-blue-300 rounded-lg cursor-move hover:bg-blue-100 hover:border-blue-500 transition-all text-sm font-medium text-slate-900 shadow-sm"
                  title={variable.description}
                >
                  {`{{${variable.name}}}`}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Basic Info & Variables */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-slate-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Critical Event Alert"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Template Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="CRITICAL_ALERT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Template description..."
                  />
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Distribution Channel
                  </label>
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📧</span>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Email Only</p>
                        <p className="text-xs text-blue-700">All notifications will be sent via email</p>
                      </div>
                    </div>
                  </div>
                  {/* Hidden checkbox to maintain compatibility - always checked for email */}
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    className="hidden"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add tag..."
                    />
                    <button
                      onClick={addTag}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
                      >
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Variables */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Template Variables</h3>
                  <button
                    onClick={addVariable}
                    className="p-1 hover:bg-slate-200 rounded transition-all"
                  >
                    <Plus className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, variable.name)}
                      className="bg-white p-3 rounded-lg border border-slate-200 cursor-move hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-slate-400 text-sm font-semibold mt-1">⋮⋮</span>
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm font-mono"
                          placeholder="variable_name"
                        />
                        <button
                          onClick={() => removeVariable(index)}
                          className="p-1 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={variable.description}
                        onChange={(e) => updateVariable(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-2"
                        placeholder="Description"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={variable.required}
                          onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                          className="w-3 h-3 text-blue-600 rounded"
                        />
                        <span className="text-slate-600">Required</span>
                      </label>
                      <p className="text-xs text-slate-500 mt-2">💡 Drag to template body to insert</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Channel Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Email Header with Preview Button */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📧</span>
                  <h3 className="text-lg font-bold text-slate-900">Email Content</h3>
                </div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    showPreview
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>

              {/* Channel Content */}
              {!showPreview ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Critical PQ Event: {{event_type}} at {{location}}"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Body *
                    </label>
                    <div className="relative border border-slate-300 rounded-lg overflow-hidden">
                      {/* Formatting Toolbar - Word Style */}
                      <div className="bg-white border-b border-slate-200 px-4 py-2">
                        <div className="flex items-center gap-4">
                          {/* Font Group */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 uppercase font-semibold">Font</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (editorRef.current) editorRef.current.focus();
                                  setTimeout(() => {
                                    document.execCommand('bold');
                                    updateFormatState();
                                  }, 0);
                                }}
                                className={`px-3 py-1.5 rounded transition-all text-sm font-bold border ${
                                  isBoldActive 
                                    ? 'bg-blue-50 border-blue-400 text-blue-700' 
                                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Bold (Ctrl+B)"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (editorRef.current) editorRef.current.focus();
                                  setTimeout(() => {
                                    document.execCommand('italic');
                                    updateFormatState();
                                  }, 0);
                                }}
                                className={`px-3 py-1.5 rounded transition-all text-sm italic border ${
                                  isItalicActive 
                                    ? 'bg-blue-50 border-blue-400 text-blue-700' 
                                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Italic (Ctrl+I)"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (editorRef.current) editorRef.current.focus();
                                  setTimeout(() => {
                                    document.execCommand('underline');
                                    updateFormatState();
                                  }, 0);
                                }}
                                className={`px-3 py-1.5 rounded transition-all text-sm underline border ${
                                  isUnderlineActive 
                                    ? 'bg-blue-50 border-blue-400 text-blue-700' 
                                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Underline (Ctrl+U)"
                              >
                                U
                              </button>
                            </div>
                          </div>

                          <div className="w-px h-12 bg-slate-300"></div>

                          {/* Insert Group */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 uppercase font-semibold">Insert</span>
                            <button
                              type="button"
                              onClick={() => {
                                // Save current cursor position
                                const selection = window.getSelection();
                                if (selection && selection.rangeCount > 0) {
                                  setSavedRange(selection.getRangeAt(0).cloneRange());
                                }
                                setShowTableModal(true);
                              }}
                              className="px-4 py-1.5 bg-slate-50 border border-slate-300 rounded hover:bg-slate-100 transition-all text-sm font-medium text-slate-700 flex items-center gap-2"
                              title="Insert Table"
                            >
                              <span>📊</span>
                              <span>Table</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Rich Text Editor */}
                      <div className="relative">
                        {!emailBody && (
                          <div className="absolute top-4 left-4 text-slate-400 text-sm pointer-events-none">
                            Start typing or drag variables here...
                          </div>
                        )}
                        {dragCursorPosition && (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: `${dragCursorPosition.x}px`,
                              top: `${dragCursorPosition.y}px`,
                              width: '2px',
                              height: '20px',
                              backgroundColor: '#3b82f6',
                              animation: 'blink 1s infinite'
                            }}
                          />
                        )}
                        <div
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            setIsEditingBody(true);
                            setEmailBody(e.currentTarget.innerHTML);
                          }}
                          onFocus={() => {
                            setIsEditingBody(true);
                            updateFormatState();
                          }}
                          onBlur={() => setIsEditingBody(false)}
                          onKeyUp={updateFormatState}
                          onMouseUp={updateFormatState}
                          onDragOver={handleDragOver}
                          onDragLeave={() => setDragCursorPosition(null)}
                          onDrop={handleDropOnTextarea}
                          className="w-full px-4 py-4 min-h-80 focus:outline-none text-sm overflow-y-auto bg-white"
                          style={{ fontSize: '14px', lineHeight: '1.6' }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">💡 Drag variables from the top to insert them into the template</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 min-h-96">
                  <h3 className="font-bold text-slate-900 mb-4">Preview with Sample Data</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-2">Subject:</p>
                      <p className="text-lg font-semibold text-slate-900">{getPreviewContent().subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-2">Body:</p>
                      <div
                        className="bg-white p-4 rounded-lg border border-slate-200"
                        dangerouslySetInnerHTML={{ __html: getPreviewContent().body }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            Templates are saved as drafts and require admin approval
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Table Dimension Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Insert Table</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Number of Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Number of Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableColumns}
                  onChange={(e) => setTableColumns(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertTable}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
