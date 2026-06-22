export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
          animation: 'drift1 18s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          bottom: '10%',
          right: '-5%',
          animation: 'drift2 22s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[80px]"
        style={{
          background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)',
          top: '50%',
          left: '40%',
          animation: 'drift3 26s ease-in-out infinite alternate',
        }}
      />
    </div>
  )
}
