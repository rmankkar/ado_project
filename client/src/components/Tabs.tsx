interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="bg-white border-b border-neutral-200 sticky top-16 z-10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <ul className="flex flex-wrap -mb-px gap-1" role="tablist">
          {tabs.map(tab => (
            <li key={tab.id} role="presentation">
              <button
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                onClick={() => onChange(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  activeTab === tab.id
                    ? 'text-primary-600 bg-primary-50 border-b-2 border-primary-600'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}