import React, { useRef, useEffect, useState } from 'react';
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';
import 'tui-color-picker/dist/tui-color-picker.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import { api } from '@/services/api';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Loader2, CheckCircle2, XCircle, X, 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  Quote, List, ListOrdered, Image as ImageIcon, Link2, Code, Minus, Palette, Terminal, Video
} from 'lucide-react';

const BRAND = "#E05A47";

interface WysiwygEditorProps {
  value?: string;
  onChange: (markdown: string) => void;
  height?: string;
}

export default function WysiwygEditor({
  value = '',
  onChange,
  height = '500px',
}: WysiwygEditorProps) {
  const editorRef = useRef<Editor>(null);
  const isInitialized = useRef(false);

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  
  // Custom dialog modals state
  const [modalType, setModalType] = useState<'none' | 'link' | 'embed'>('none');
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== undefined && !isInitialized.current) {
      editorRef.current.getInstance().setMarkdown(value);
      isInitialized.current = true;
    }
  }, [value]);

  const handleChange = () => {
    if (editorRef.current) {
      const markdown = editorRef.current.getInstance().getMarkdown();
      onChange(markdown);
    }
  };

  const uploadImageCore = async (file: File): Promise<string | null> => {
    try {
      setUploadStatus('uploading');
      setUploadMessage('Uploading image securely...');
      
      const formData = new FormData();
      const fileName = file.name || `image_${Date.now()}.png`;
      formData.append('file', file, fileName);
      
      const response = await api.post('/uploads/image?folder=blog_images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response.data.url;
      
      setUploadStatus('success');
      setUploadMessage('Image uploaded successfully!');
      setTimeout(() => setUploadStatus('idle'), 3000);
      
      return url;
    } catch (error: any) {
      console.error('Image upload failed:', error);
      setUploadStatus('error');
      setUploadMessage(error?.response?.data?.detail || 'Failed to upload image. Please try again.');
      return null;
    }
  }

  // Hook for drag and drop / paste from Toast UI natively
  const handleImageBlobHook = async (blob: Blob | File, callback: (url: string, altText: string) => void) => {
    const url = await uploadImageCore(blob as File);
    if (url) {
      callback(url, 'image');
    }
  };

  // Custom Toolbar actions
  const executeCommand = (command: string, payload?: any) => {
    if (editorRef.current) {
      editorRef.current.getInstance().exec(command, payload);
    }
  };

  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImageCore(file);
      if (url && editorRef.current) {
        // exec('addImage') is the correct standard for ToastUI WYSIWYG mode
        editorRef.current.getInstance().exec('addImage', { imageUrl: url, altText: 'image' });
      }
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const openLinkModal = () => {
    setInputUrl('https://');
    setInputTitle('');
    setModalType('link');
  };

  const openEmbedModal = () => {
    setInputUrl('https://');
    setModalType('embed');
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    if (modalType === 'link') {
      executeCommand('AddLink', { linkUrl: inputUrl, linkText: inputTitle || inputUrl });
    } else if (modalType === 'embed') {
      let embedHtml = "";
      const ytMatch = inputUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" class="w-full aspect-video rounded-xl border border-slate-200 my-4" allowfullscreen></iframe>\n`;
      } else {
        embedHtml = `<iframe src="${inputUrl}" class="w-full min-h-[400px] rounded-xl border border-slate-200 my-4"></iframe>\n`;
      }
      if (editorRef.current) {
        editorRef.current.getInstance().insertText(embedHtml);
      }
    }

    setModalType('none');
    setInputUrl('');
    setInputTitle('');
  };

  const ToolbarButton = ({ icon: Icon, onClick, title }: { icon: any, onClick: () => void, title: string }) => (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-center"
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="relative w-full bg-white text-black rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.02),0_8px_30px_rgba(15,23,42,0.035)] border border-slate-200/80 flex flex-col overflow-hidden" style={{ height }}>
      
      {/* Custom Professional Toolbar */}
      <div className="flex items-center flex-wrap gap-1 px-3 py-2 border-b border-slate-200 bg-white z-10 shrink-0">
        <ToolbarButton title="Heading 1" icon={Heading1} onClick={() => executeCommand('heading', { level: 1 })} />
        <ToolbarButton title="Heading 2" icon={Heading2} onClick={() => executeCommand('heading', { level: 2 })} />
        <ToolbarButton title="Heading 3" icon={Heading3} onClick={() => executeCommand('heading', { level: 3 })} />
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton title="Bold" icon={Bold} onClick={() => executeCommand('bold')} />
        <ToolbarButton title="Italic" icon={Italic} onClick={() => executeCommand('italic')} />
        <ToolbarButton title="Strikethrough" icon={Strikethrough} onClick={() => executeCommand('strike')} />
        <ToolbarButton title="Code (Inline)" icon={Code} onClick={() => executeCommand('code')} />
        <ToolbarButton title="Code Block" icon={Terminal} onClick={() => executeCommand('codeBlock')} />
        <div className="relative flex items-center">
          <label className="cursor-pointer p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-center">
            <Palette className="w-4 h-4" />
            <input 
              type="color" 
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              onChange={(e) => executeCommand('color', { color: e.target.value })}
              title="Text Color"
            />
          </label>
        </div>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton title="Bullet List" icon={List} onClick={() => executeCommand('bulletList')} />
        <ToolbarButton title="Numbered List" icon={ListOrdered} onClick={() => executeCommand('orderedList')} />
        <ToolbarButton title="Blockquote" icon={Quote} onClick={() => executeCommand('blockQuote')} />
        <ToolbarButton title="Divider" icon={Minus} onClick={() => executeCommand('hr')} />
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton title="Add Link" icon={Link2} onClick={openLinkModal} />
        <ToolbarButton title="Embed Media (YouTube / IFrame)" icon={Video} onClick={openEmbedModal} />
        
        {/* Hidden file input for custom image button */}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleCustomImageUpload} 
        />
        <ToolbarButton title="Upload Image" icon={ImageIcon} onClick={() => fileInputRef.current?.click()} />
      </div>

      <style>{`
        /* Hide Default Toolbar & Mode Switch */
        .toastui-editor-toolbar {
          display: none !important;
        }
        .toastui-editor-mode-switch {
          display: none !important;
        }
        .toastui-editor-defaultUI {
          border: none !important;
        }

        /* Modern Typography inside Editor */
        .toastui-editor-main {
          font-family: 'Inter', system-ui, sans-serif !important;
          font-size: 16px !important;
          line-height: 1.8 !important;
          color: #334155 !important;
        }
        
        .toastui-editor-contents {
          font-family: 'Inter', system-ui, sans-serif !important;
          font-size: 16px !important;
          line-height: 1.8 !important;
          padding: 32px 40px !important;
        }

        @media (max-width: 640px) {
          .toastui-editor-contents {
            padding: 24px 20px !important;
          }
        }

        .toastui-editor-contents p {
          color: #334155 !important;
          margin: 1.2em 0 !important;
        }

        .toastui-editor-contents h1, 
        .toastui-editor-contents h2, 
        .toastui-editor-contents h3 {
          font-weight: 800 !important;
          letter-spacing: -0.02em !important;
          color: #0f172a !important;
          border-bottom: none !important;
          margin-top: 1.8em !important;
          margin-bottom: 0.5em !important;
        }
        
        .toastui-editor-contents a {
          color: ${BRAND} !important;
          text-decoration: none !important;
        }
        .toastui-editor-contents a:hover {
          text-decoration: underline !important;
        }

        .toastui-editor-contents blockquote {
          border-left: 4px solid ${BRAND} !important;
          color: #64748b !important;
          padding-left: 16px !important;
          margin-left: 0 !important;
          background: #f8fafc !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          border-radius: 0 4px 4px 0 !important;
        }

        .toastui-editor-contents img {
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
          margin: 2em 0 !important;
          max-width: 100% !important;
        }

        .toastui-editor-contents iframe {
          width: 100% !important;
          max-width: 100% !important;
          aspect-ratio: 16 / 9 !important;
          border-radius: 12px !important;
          border: 1px solid #e2e8f0 !important;
          margin: 1.5em 0 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
        }
        
        .toastui-editor-contents ul > li::before {
          background-color: #94a3b8 !important;
        }

        .toastui-editor-contents pre {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          padding: 16px !important;
          border-radius: 8px !important;
          margin: 1.5em 0 !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          font-size: 14px !important;
          overflow-x: auto !important;
        }

        .toastui-editor-contents code {
          background-color: #f1f5f9 !important;
          color: #db2777 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-size: 0.9em !important;
        }

        .toastui-editor-contents pre code {
          background-color: transparent !important;
          color: inherit !important;
          padding: 0 !important;
        }

        .toastui-editor-contents *::selection {
          background-color: #fca5a5 !important;
          color: #7f1d1d !important;
        }
      `}</style>

      {/* Floating Upload Notification */}
      <AnimatePresence>
        {uploadStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-0 right-0 mx-auto z-[60] flex items-center justify-between max-w-[300px] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-200 shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              {uploadStatus === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
              {uploadStatus === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              {uploadStatus === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
              <span className={`text-[10px] sm:text-[11px] font-bold ${
                uploadStatus === 'error' ? 'text-red-600' : 'text-slate-700'
              }`}>
                {uploadMessage}
              </span>
            </div>
            
            {uploadStatus === 'error' && (
              <button 
                onClick={() => setUploadStatus('idle')}
                className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Overlay Dialog Modal */}
      <AnimatePresence>
        {modalType !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalType('none')}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">
                  {modalType === 'link' ? 'Insert Link' : 'Embed Media / Video'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalType('none')}
                  className="size-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
                {modalType === 'link' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Link Text (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Visit Website"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#E05A47]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {modalType === 'link' ? 'URL' : 'YouTube or Embed URL'}
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#E05A47]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalType('none')}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#E05A47] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#d04a37]"
                  >
                    Insert
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden">
        <Editor
          ref={editorRef}
          initialValue={value || ' '}
          height="100%"
          initialEditType="wysiwyg"
          useCommandShortcut={true}
          hideModeSwitch={true}
          onChange={handleChange}
          plugins={[colorSyntax]}
          hooks={{
            addImageBlobHook: handleImageBlobHook
          }}
        />
      </div>
    </div>
  );
}
