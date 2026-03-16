import { useState } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResults([]);
    setDownloadUrl("");

    const form = new FormData();
    form.append("file", file);
    try {
      // REPLACE THIS URL WITH YOUR VERCEL BACKEND URL
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await axios.post(`${apiUrl}/upload`, form);
      setResults(res.data.data);
      setHeaders(res.data.headers);

      // Create blob for download
      const blob = new Blob([res.data.csvString], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err) {
      console.error("URL used:", import.meta.env.VITE_API_URL); // Debugging
      alert("Upload failed");
      alert("Error: " + (err.response?.data?.error || "Upload failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-4 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-white mb-2">
            Domain Finder
          </h1>
          <p className="text-zinc-500">
            Upload CSV • Auto-Find Domains • Download Enriched File
          </p>
        </header>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12 bg-zinc-800/30 p-6 rounded-2xl border border-zinc-800">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
          />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`px-10 py-3 rounded-full font-bold transition-all ${
              loading
                ? "bg-zinc-700 text-zinc-500 animate-pulse"
                : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            {loading ? "Enriching..." : "Process CSV"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Preview</h2>
                <p className="text-zinc-500 text-sm">
                  Showing first 30 results. Domain column is at the end.
                </p>
              </div>
              <a
                href={downloadUrl}
                download="enriched_data.csv"
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-xl font-bold transition-transform hover:scale-105"
              >
                Download Complete CSV
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-800 text-white z-10">
                    <tr>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="p-4 text-xs uppercase font-black border-b border-zinc-700"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {results.slice(0, 30).map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-800/40">
                        {headers.map((h) => (
                          <td
                            key={h}
                            className={`p-4 text-sm ${h === "domain" ? "text-indigo-400 font-medium" : "text-zinc-400"}`}
                          >
                            {row[h] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
