export const metadata = { robots: { index: false, follow: false } };

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-root min-h-[100dvh]">
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('crm-theme')==='light')document.documentElement.setAttribute('data-crm-theme','light');}catch(e){}`,
        }}
      />
      {children}
    </div>
  );
}
