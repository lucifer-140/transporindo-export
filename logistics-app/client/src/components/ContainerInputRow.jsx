export default function ContainerInputRow({ container, index, onChange, onRemove }) {
  function update(field, value) {
    onChange(index, { ...container, [field]: value });
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text" placeholder="Container No (e.g. FFAU6615812)"
        value={container.container_no}
        onChange={e => update('container_no', e.target.value)}
        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text" placeholder="Seal No"
        value={container.seal_no}
        onChange={e => update('seal_no', e.target.value)}
        className="w-36 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={container.size}
        onChange={e => update('size', e.target.value)}
        className="w-20 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none"
      >
        <option value="20">20</option>
        <option value="40">40</option>
      </select>
      <button type="button" onClick={() => onRemove(index)}
        className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
    </div>
  );
}
