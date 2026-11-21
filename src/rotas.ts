import { BedDouble, ClipboardList, FileClock, FileText, HeartPulse, Hospital, LayoutDashboard, LockKeyhole, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import type { Perfil } from '@/api/tipos'

export interface ItemDeMenu {
  caminho: string
  rotulo: string
  grupo: 'VISÃO GERAL' | 'ATENDIMENTO' | 'GESTÃO DA REDE'
  icone: LucideIcon
  /** Perfis que veem o item: os mesmos que o back-end aceita nas rotas da tela (@PreAuthorize). */
  perfis: readonly Perfil[]
  descricao: string
  /** Card que entrega a tela. */
  card: string
}

/**
 * Tabela única das telas autenticadas. O menu e a guarda de rota usam a mesma regra (podeAcessar). A página de
 * cada item entregue fica em PAGINAS (App.tsx); as outras mostram "Em construção" até o card delas.
 */
export const ITENS_DE_MENU: readonly ItemDeMenu[] = [
  {
    caminho: '/painel',
    rotulo: 'Painel',
    grupo: 'VISÃO GERAL',
    icone: LayoutDashboard,
    perfis: ['MEDICO', 'ENFERMEIRO', 'ADMINISTRATIVO', 'AUDITOR_GESTOR'],
    descricao: 'Números de agora por hospital: leitos, fila por risco, espera e transferências.',
    card: 'FE-09',
  },
  {
    caminho: '/pacientes',
    rotulo: 'Pacientes',
    grupo: 'VISÃO GERAL',
    icone: Users,
    perfis: ['ADMINISTRATIVO'],
    descricao: 'Busca por CPF na rede, cadastro e consentimento inicial.',
    card: 'FE-03',
  },
  {
    caminho: '/meu-prontuario',
    rotulo: 'Meu prontuário',
    grupo: 'VISÃO GERAL',
    icone: FileText,
    perfis: ['PACIENTE'],
    descricao: 'Seu histórico clínico na rede e quem acessou o seu prontuário.',
    card: 'FE-05',
  },
  {
    caminho: '/triagem',
    rotulo: 'Triagem',
    grupo: 'ATENDIMENTO',
    icone: HeartPulse,
    perfis: ['ENFERMEIRO'],
    descricao: 'Classificação de risco com sugestão da IA e confirmação do enfermeiro.',
    card: 'FE-06',
  },
  {
    caminho: '/atendimentos',
    rotulo: 'Atendimentos',
    grupo: 'ATENDIMENTO',
    icone: ClipboardList,
    perfis: ['MEDICO', 'ENFERMEIRO'],
    descricao: 'Fila por prioridade e prontuário autorizado do paciente em atendimento.',
    card: 'FE-06 e FE-07',
  },
  {
    caminho: '/leitos',
    rotulo: 'Leitos',
    grupo: 'ATENDIMENTO',
    icone: BedDouble,
    perfis: ['ADMINISTRATIVO'],
    descricao: 'Leitos por categoria e situação.',
    card: 'FE-04',
  },
  {
    caminho: '/internacoes',
    rotulo: 'Internações',
    grupo: 'ATENDIMENTO',
    icone: Hospital,
    perfis: ['ADMINISTRATIVO'],
    descricao: 'Internação, transferência entre leitos e instituições, e alta.',
    card: 'FE-04',
  },
  {
    caminho: '/consentimentos',
    rotulo: 'Consentimentos',
    grupo: 'GESTÃO DA REDE',
    icone: LockKeyhole,
    perfis: ['PACIENTE'],
    descricao: 'Compartilhamento dos seus dados, restrições e autorizações.',
    card: 'FE-05',
  },
  {
    caminho: '/auditoria',
    rotulo: 'Auditoria',
    grupo: 'GESTÃO DA REDE',
    icone: ShieldCheck,
    perfis: ['AUDITOR_GESTOR'],
    descricao: 'Registro imutável de acessos, emergências pendentes e análises.',
    card: 'FE-08',
  },
  {
    caminho: '/relatorios',
    rotulo: 'Relatórios',
    grupo: 'GESTÃO DA REDE',
    icone: FileClock,
    perfis: ['AUDITOR_GESTOR'],
    descricao: 'Indicadores de acesso por instituição e período.',
    card: 'FE-08',
  },
]

export const GRUPOS_DO_MENU = ['VISÃO GERAL', 'ATENDIMENTO', 'GESTÃO DA REDE'] as const
