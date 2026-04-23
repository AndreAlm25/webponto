import { ThemeToggle } from '@/components/theme-toggle'
import { CheckCircle2, Clock8, ShieldCheck, Camera, Users, Rocket } from 'lucide-react'

// Landing Page moderna e responsiva do WebPonto
// - Textos em português (UX brasileira)
// - Código em inglês (padrão internacional)
// - Seções: Hero, Benefícios, Como funciona, Planos, Depoimentos, CTA, Footer
export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background text-foreground">
      <header className="w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 z-40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="inline-block w-2 h-2 rounded-full bg-webponto-blue" />
            <span>WebPonto</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#beneficios" className="hover:text-foreground">Benefícios</a>
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#depoimentos" className="hover:text-foreground">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="px-4 py-2 text-sm rounded-md border hover:bg-accent transition">Entrar</a>
            <a href="/cadastro" className="px-4 py-2 text-sm rounded-md bg-webponto-blue text-white hover:bg-webponto-blue-dark transition">Cadastrar</a>
          </div>
        </div>
      </header>

      {/* Ações fixas (tema) */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-webponto-blue/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 pt-36 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-webponto-blue bg-webponto-blue/10 px-3 py-1 rounded-full">
                <Rocket className="w-3.5 h-3.5" /> Nova geração de ponto eletrônico
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
                Gestão de ponto com reconhecimento facial e conformidade legal
              </h1>
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl">
                Simplifique o controle de jornada, aumente a segurança com biometria facial e tenha visibilidade em tempo real do seu time.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="/login" className="px-6 py-3 rounded-lg bg-webponto-blue text-white hover:bg-webponto-blue-dark transition font-medium text-center">
                  Acessar agora
                </a>
                <a href="#planos" className="px-6 py-3 rounded-lg border border-border hover:bg-accent transition font-medium text-center">
                  Ver planos
                </a>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-webponto-blue" /> LGPD ready</div>
                <div className="flex items-center gap-2"><Clock8 className="w-4 h-4 text-webponto-blue" /> Cartão ponto digital</div>
                <div className="flex items-center gap-2"><Camera className="w-4 h-4 text-webponto-blue" /> Reconhecimento facial</div>
              </div>
            </div>
            <div className="lg:pl-8">
              <div className="relative rounded-2xl border bg-card p-5 shadow-sm">
                <div className="aspect-video rounded-xl bg-gradient-to-br from-webponto-blue/20 to-transparent grid place-items-center">
                  <Camera className="w-14 h-14 text-webponto-blue" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div className="p-3 rounded-lg border bg-background"><b className="block text-foreground">Ponto Facial</b> Em segundos</div>
                  <div className="p-3 rounded-lg border bg-background"><b className="block text-foreground">Acurácia</b> Alto nível</div>
                  <div className="p-3 rounded-lg border bg-background"><b className="block text-foreground">Online</b> Em qualquer lugar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="container mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-center">Por que o WebPonto?</h2>
        <p className="mt-2 text-center text-muted-foreground max-w-2xl mx-auto">
          Inspirado por referências como Sólides, TwoRH e VR, mas pensado para sua operação no dia a dia.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <ShieldCheck className="w-6 h-6 text-webponto-blue" />, title: 'Confiável e seguro', desc: 'Criptografia, LGPD e logs de auditoria para total conformidade.' },
            { icon: <Clock8 className="w-6 h-6 text-webponto-blue" />, title: 'Jornada sob controle', desc: 'Registros, banco de horas e relatórios em tempo real.' },
            { icon: <Users className="w-6 h-6 text-webponto-blue" />, title: 'Experiência do colaborador', desc: 'Ponto rápido por rosto e app web responsivo.' },
          ].map((b, i) => (
            <div key={i} className="rounded-xl border p-6 bg-card shadow-sm">
              <div className="mb-3">{b.icon}</div>
              <h3 className="font-semibold text-lg">{b.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-muted/40">
        <div className="container mx-auto px-6 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Como funciona</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Cadastro facial', desc: 'O colaborador registra o rosto uma única vez.' },
              { step: '02', title: 'Reconhecimento', desc: 'Ao chegar, o sistema reconhece e registra o ponto.' },
              { step: '03', title: 'Relatórios', desc: 'Gestão da jornada e relatórios para tomada de decisão.' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border p-6 bg-card shadow-sm">
                <div className="text-xs font-mono text-muted-foreground">Etapa {s.step}</div>
                <h3 className="font-semibold text-lg mt-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/ponto/facial" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-webponto-blue text-white hover:bg-webponto-blue-dark transition font-medium">
              Experimentar ponto facial
            </a>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="container mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-center">Planos que crescem com você</h2>
        <p className="mt-2 text-center text-muted-foreground max-w-2xl mx-auto">
          Transparência e previsibilidade para seu negócio.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-lg">Starter</h3>
            <p className="text-sm text-muted-foreground mt-1">Até 20 colaboradores</p>
            <div className="mt-4 text-3xl font-extrabold">R$ 99<span className="text-base font-medium text-muted-foreground">/mês</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              {['Ponto facial', 'Relatórios básicos', 'Suporte por e-mail'].map((f, i) => (
                <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-webponto-blue" /> {f}</li>
              ))}
            </ul>
            <a href="/cadastro" className="mt-6 inline-block w-full text-center px-4 py-2 rounded-md bg-webponto-blue text-white hover:bg-webponto-blue-dark transition">Começar</a>
          </div>
          {/* Business */}
          <div className="rounded-2xl border bg-card p-6 shadow-lg ring-1 ring-webponto-blue/20">
            <div className="inline-block text-xs font-medium text-white bg-webponto-blue px-2.5 py-1 rounded-full">Mais popular</div>
            <h3 className="mt-2 font-semibold text-lg">Business</h3>
            <p className="text-sm text-muted-foreground mt-1">Até 100 colaboradores</p>
            <div className="mt-4 text-3xl font-extrabold">R$ 249<span className="text-base font-medium text-muted-foreground">/mês</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              {['Tudo do Starter', 'Relatórios avançados', 'Múltiplas unidades', 'Suporte prioritário'].map((f, i) => (
                <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-webponto-blue" /> {f}</li>
              ))}
            </ul>
            <a href="/cadastro" className="mt-6 inline-block w-full text-center px-4 py-2 rounded-md bg-webponto-blue text-white hover:bg-webponto-blue-dark transition">Assinar</a>
          </div>
          {/* Enterprise */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-lg">Enterprise</h3>
            <p className="text-sm text-muted-foreground mt-1">+100 colaboradores</p>
            <div className="mt-4 text-3xl font-extrabold">Sob consulta</div>
            <ul className="mt-4 space-y-2 text-sm">
              {['SSO/SCIM', 'SLA dedicado', 'Consultoria de implantação'].map((f, i) => (
                <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-webponto-blue" /> {f}</li>
              ))}
            </ul>
            <a href="/login" className="mt-6 inline-block w-full text-center px-4 py-2 rounded-md border hover:bg-accent transition">Falar com vendas</a>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="bg-muted/40">
        <div className="container mx-auto px-6 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-center">O que dizem nossos clientes</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Carla, RH', text: 'Reduzimos em 60% o tempo gasto com conferência de ponto.' },
              { name: 'Marcos, Operações', text: 'Reconhecimento facial rápido e sem filas no início do turno.' },
              { name: 'Patrícia, CFO', text: 'Visibilidade financeira da jornada e previsibilidade de custos.' },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border p-6 bg-card shadow-sm">
                <p className="text-sm text-muted-foreground">“{t.text}”</p>
                <div className="mt-3 text-sm font-medium">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto px-6 py-14 text-center">
        <h2 className="text-2xl md:text-3xl font-bold">Pronto para modernizar seu controle de ponto?</h2>
        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Comece agora mesmo com o WebPonto.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/cadastro" className="px-6 py-3 rounded-lg bg-webponto-blue text-white hover:bg-webponto-blue-dark transition font-medium">Cadastrar empresa</a>
          <a href="#planos" className="px-6 py-3 rounded-lg border border-border hover:bg-accent transition font-medium">Ver planos</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            © {new Date().getFullYear()} WebPonto — Todos os direitos reservados
          </div>
          <nav className="flex items-center gap-5">
            <a href="#beneficios" className="hover:text-foreground">Benefícios</a>
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#depoimentos" className="hover:text-foreground">Depoimentos</a>
          </nav>
        </div>
      </footer>
    </main>
  )
}
