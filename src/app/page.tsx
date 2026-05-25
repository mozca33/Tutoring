import Link from "next/link";

const features = [
  { title: "Vídeo ao vivo", desc: "Sala de aula com vídeo, áudio e compartilhamento de tela via LiveKit." },
  { title: "Chat em tempo real", desc: "Converse com seus alunos ou professor a qualquer momento." },
  { title: "Materiais da aula", desc: "Envie e baixe PDFs, slides, exercícios e qualquer arquivo." },
  { title: "Lição de casa", desc: "Atribua, entregue e corrija tarefas com nota e feedback." },
  { title: "Agenda inteligente", desc: "Agende, edite ou cancele aulas com poucos cliques." },
  { title: "Histórico completo", desc: "Resumos, comentários e materiais organizados por aula." },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6 py-24">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Aulas particulares, do agendamento à sala virtual.
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Plataforma completa para professores e alunos: vídeo ao vivo, chat,
            materiais, lição de casa e histórico de aulas.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/signup" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Criar conta grátis
            </Link>
            <Link href="/login" className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-12">Tudo que você precisa em um só lugar</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="border rounded-xl p-6 hover:border-indigo-200 transition-colors">
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-50 border-t px-6 py-8 text-center text-sm text-slate-500">
        Tutoring &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
