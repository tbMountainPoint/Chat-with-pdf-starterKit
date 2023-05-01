import { useDropzone } from 'react-dropzone';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FileUploadAreaProps {
  setFiles: React.Dispatch<React.SetStateAction<null>>;
  isUploading: boolean;
  handleFileUpload: () => void;
  files: any;
}

export function FileUploadArea({
  setFiles,
  isUploading,
  handleFileUpload,
  files,
}: FileUploadAreaProps) {
  const onDrop = useCallback((acceptedFiles: any) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt', '.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 5,
  });

  return (
    <div className="flex flex-col items-start gap-2 min-w-[400px]">
      <h2 className="mt-10 scroll-m-20 pb-2 text-lg font-semibold tracking-tight transition-colors first:mt-0">
        Upload one or more files
      </h2>
      <div
        className="w-full rounded-md border border-slate-200 p-0 dark:border-slate-700"
        {...getRootProps()}
      >
        <div className="flex min-h-[150px] cursor-pointer items-center justify-center p-10">
          <input {...getInputProps()} />
          {files ? (
            <ul>
              {files.map((file: any) => (
                <li key={file.name} className="space-y-2">
                  *{file.name}*
                </li>
              ))}
            </ul>
          ) : (
            <>
              {isDragActive ? (
                <p>Drop the files here ...</p>
              ) : (
                <p>
                  Drag and drop some files here, or click to select files.
                  <br />
                  Accepts .pdf, .txt, .md, .docx, .csv, .json (max 5 files)
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <Button
        type="button"
        onClick={handleFileUpload}
        disabled={
          !files || isUploading
          // hasMissingCredentials()
        }
      >
        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Upload
      </Button>
    </div>
  );
}
