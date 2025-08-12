export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-semibold text-gray-900 mb-4">
          EOD Insurance Supplement Analysis
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Professional insurance supplement analysis with real-time AI processing
        </p>
        <div className="flex gap-4 justify-center">
          <a 
            href="/design" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Design System
          </a>
          <a 
            href="/dashboard" 
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}