interface ContractAddressRowProps {
  label: string;
  address: string;
  explorerUrl: string;
  icon: React.ReactNode;
}

export function ContractAddressRow({ label, address, explorerUrl, icon }: ContractAddressRowProps) {
  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  // Validación de seguridad: usar valor por defecto si address es undefined/null
  const safeAddress = address || "";
  const shortenedAddress = safeAddress.length > 10
    ? `${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}`
    : safeAddress || "No disponible";

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 hover:bg-gray-100 transition-colors group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="text-purple-500 flex-shrink-0">
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-600 flex-shrink-0">{label}:</span>
        <a
          href={safeAddress ? explorerUrl : "#"}
          target="_blank"
          rel={safeAddress ? "noopener noreferrer" : undefined}
          className={`font-mono text-xs truncate transition-colors ${safeAddress ? "text-gray-800 hover:text-purple-600 cursor-pointer" : "text-gray-400 cursor-default"}`}
          title={safeAddress || "Dirección no disponible"}
        >
          {shortenedAddress}
        </a>
      </div>
      <button
        onClick={copyToClipboard}
        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
        title="Copiar dirección"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}
