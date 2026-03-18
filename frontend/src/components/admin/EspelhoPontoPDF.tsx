'use client'

import { Document, Page, Text, View, StyleSheet, Image, Svg, Path, Rect, Circle } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  // Cabeçalho principal
  header: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottom: '2 solid #e5e5e5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666666',
  },
  // Seções de dados (funcionário e empresa)
  dataSection: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  dataBox: {
    flex: 1,
    border: '1 solid #e5e5e5',
    borderRadius: 4,
  },
  dataBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderBottom: '1 solid #e5e5e5',
  },
  dataBoxTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  dataBoxContent: {
    padding: 10,
  },
  // Avatar e Logo circulares com borda simples
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '2 solid #E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  logoContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '2 solid #E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  // Linhas de dados
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 80,
    color: '#666666',
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#1a1a1a',
  },
  // Títulos de seção com ícone
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
  },
  sectionIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  // Resumo do período
  resumoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  resumoBox: {
    border: '1 solid #e5e5e5',
    padding: 8,
    marginRight: 5,
    marginBottom: 5,
    width: '18%',
    textAlign: 'center',
    borderRadius: 4,
  },
  resumoBoxLarge: {
    border: '1 solid #e5e5e5',
    padding: 8,
    marginRight: 5,
    marginBottom: 5,
    width: '30%',
    textAlign: 'center',
    borderRadius: 4,
  },
  resumoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#1a1a1a',
  },
  resumoLabel: {
    fontSize: 7,
    color: '#666666',
  },
  // Tabela
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottom: '1 solid #333333',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #eeeeee',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowWeekend: {
    flexDirection: 'row',
    borderBottom: '1 solid #eeeeee',
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: '#fafafa',
  },
  colData: { width: '10%', fontSize: 8 },
  colDia: { width: '8%', fontSize: 8 },
  colHora: { width: '12%', textAlign: 'center', fontSize: 8 },
  colTotal: { width: '12%', textAlign: 'center', fontSize: 8, fontWeight: 'bold' },
  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    right: 25,
    textAlign: 'center',
    fontSize: 7,
    color: '#999999',
    borderTop: '1 solid #eeeeee',
    paddingTop: 8,
  },
  // Cores
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
  green: { color: '#16a34a' },
  red: { color: '#dc2626' },
  blue: { color: '#2563eb' },
  purple: { color: '#7c3aed' },
  orange: { color: '#ea580c' },
})

interface EspelhoPontoData {
  funcionario: {
    nome: string
    cpf: string
    matricula: string
    cargo: string
    departamento: string
    dataAdmissao: string
    jornadaDiaria: string
    fotoUrl?: string | null
  }
  empresa: {
    nomeFantasia: string
    razaoSocial: string
    cnpj: string
    logoUrl?: string | null
  }
  periodo: {
    mesAno: string
    dataInicio: string
    dataFim: string
  }
  resumo: {
    diasUteis: number
    diasTrabalhados: number
    faltas: number
    atrasos: number
    totalHorasTrabalhadas: string
    jornadaEsperada: string
    saldo: string
    saldoPositivo: boolean
    totalHorasExtras: string
    totalHorasNoturnas: string
  }
  dias: Array<{
    data: string
    diaSemana: string
    fimDeSemana: boolean
    entrada: string | null
    inicioIntervalo: string | null
    fimIntervalo: string | null
    saida: string | null
    horasTrabalhadas: string
    horasExtras: string
  }>
  geradoEm: string
}

interface EspelhoPontoPDFProps {
  data: EspelhoPontoData
}

// Ícone de relógio (Clock) - para Resumo do Período - azul
const ClockIcon = () => (
  <Svg style={styles.sectionIcon} viewBox="0 0 24 24">
    {/* Círculo externo */}
    <Circle cx="12" cy="12" r="9" fill="none" stroke="#3b82f6" strokeWidth="2" />
    {/* Ponteiro das horas (vertical) */}
    <Rect x="11" y="7" width="2" height="6" fill="#3b82f6" />
    {/* Ponteiro dos minutos (horizontal) */}
    <Rect x="12" y="11" width="5" height="2" fill="#3b82f6" />
  </Svg>
)

// Ícone de calendário (Calendar) - para Detalhamento Diário - azul
const CalendarIcon = () => (
  <Svg style={styles.sectionIcon} viewBox="0 0 24 24">
    {/* Corpo do calendário */}
    <Rect x="3" y="6" width="18" height="15" rx="2" fill="none" stroke="#3b82f6" strokeWidth="2" />
    {/* Ganchos superiores */}
    <Rect x="7" y="3" width="2" height="5" fill="#3b82f6" />
    <Rect x="15" y="3" width="2" height="5" fill="#3b82f6" />
    {/* Linha horizontal */}
    <Rect x="3" y="10" width="18" height="2" fill="#3b82f6" />
  </Svg>
)

export function EspelhoPontoPDF({ data }: EspelhoPontoPDFProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  // Verificar se há imagens válidas
  const hasFotoFuncionario = data.funcionario.fotoUrl && data.funcionario.fotoUrl.trim().length > 0
  const hasLogoEmpresa = data.empresa.logoUrl && data.empresa.logoUrl.trim().length > 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>ESPELHO DE PONTO MENSAL</Text>
          <Text style={styles.subtitle}>
            Período: {data.periodo.dataInicio} a {data.periodo.dataFim} | {data.periodo.mesAno.toUpperCase()}
          </Text>
        </View>

        {/* Dados do Funcionário e Empresa - Layout com boxes */}
        <View style={styles.dataSection}>
          {/* Box Funcionário */}
          <View style={styles.dataBox}>
            <View style={styles.dataBoxHeader}>
              <Text style={styles.dataBoxTitle}>DADOS DO FUNCIONÁRIO</Text>
              {hasFotoFuncionario && (
                <View style={styles.avatarContainer}>
                  <Image src={data.funcionario.fotoUrl!} style={styles.avatar} />
                </View>
              )}
            </View>
            <View style={styles.dataBoxContent}>
              <View style={styles.row}>
                <Text style={styles.label}>Nome:</Text>
                <Text style={styles.value}>{data.funcionario.nome}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>CPF:</Text>
                <Text style={styles.value}>{data.funcionario.cpf}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Matrícula:</Text>
                <Text style={styles.value}>{data.funcionario.matricula}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Cargo:</Text>
                <Text style={styles.value}>{data.funcionario.cargo}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Departamento:</Text>
                <Text style={styles.value}>{data.funcionario.departamento}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Jornada:</Text>
                <Text style={styles.value}>{data.funcionario.jornadaDiaria}</Text>
              </View>
            </View>
          </View>

          {/* Box Empresa */}
          <View style={styles.dataBox}>
            <View style={styles.dataBoxHeader}>
              <Text style={styles.dataBoxTitle}>DADOS DA EMPRESA</Text>
              {hasLogoEmpresa && (
                <View style={styles.logoContainer}>
                  <Image src={data.empresa.logoUrl!} style={styles.logo} />
                </View>
              )}
            </View>
            <View style={styles.dataBoxContent}>
              <View style={styles.row}>
                <Text style={styles.label}>Razão Social:</Text>
                <Text style={styles.value}>{data.empresa.razaoSocial}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nome Fantasia:</Text>
                <Text style={styles.value}>{data.empresa.nomeFantasia}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>CNPJ:</Text>
                <Text style={styles.value}>{data.empresa.cnpj}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Resumo do Período */}
        <View style={styles.sectionHeader}>
          <ClockIcon />
          <Text style={styles.sectionTitle}>RESUMO DO PERÍODO</Text>
        </View>
        <View style={styles.resumoGrid}>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoValue}>{data.resumo.diasUteis}</Text>
            <Text style={styles.resumoLabel}>Dias Úteis</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={[styles.resumoValue, styles.green]}>{data.resumo.diasTrabalhados}</Text>
            <Text style={styles.resumoLabel}>Dias Trabalhados</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={[styles.resumoValue, styles.red]}>{data.resumo.faltas}</Text>
            <Text style={styles.resumoLabel}>Faltas</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoValue}>{data.resumo.atrasos}</Text>
            <Text style={styles.resumoLabel}>Atrasos</Text>
          </View>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoValue}>{data.resumo.totalHorasTrabalhadas}</Text>
            <Text style={styles.resumoLabel}>Horas Trabalhadas</Text>
          </View>
        </View>
        <View style={styles.resumoGrid}>
          <View style={styles.resumoBox}>
            <Text style={[styles.resumoValue, data.resumo.saldoPositivo ? styles.positive : styles.negative]}>
              {data.resumo.saldoPositivo ? '' : '-'}{data.resumo.saldo}
            </Text>
            <Text style={styles.resumoLabel}>Saldo</Text>
          </View>
          <View style={styles.resumoBoxLarge}>
            <Text style={styles.resumoValue}>{data.resumo.jornadaEsperada}</Text>
            <Text style={styles.resumoLabel}>Jornada Esperada</Text>
          </View>
          <View style={styles.resumoBoxLarge}>
            <Text style={[styles.resumoValue, styles.blue]}>{data.resumo.totalHorasExtras}</Text>
            <Text style={styles.resumoLabel}>Horas Extras</Text>
          </View>
          <View style={styles.resumoBoxLarge}>
            <Text style={[styles.resumoValue, styles.purple]}>{data.resumo.totalHorasNoturnas}</Text>
            <Text style={styles.resumoLabel}>Horas Noturnas</Text>
          </View>
        </View>

        {/* Detalhamento Diário */}
        <View style={styles.sectionHeader}>
          <CalendarIcon />
          <Text style={styles.sectionTitle}>DETALHAMENTO DIÁRIO</Text>
        </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colData}>Data</Text>
              <Text style={styles.colDia}>Dia</Text>
              <Text style={styles.colHora}>Entrada</Text>
              <Text style={styles.colHora}>Iníc. Int.</Text>
              <Text style={styles.colHora}>Fim Int.</Text>
              <Text style={styles.colHora}>Saída</Text>
              <Text style={styles.colTotal}>Trab.</Text>
              <Text style={styles.colTotal}>Extras</Text>
            </View>
            {data.dias.map((dia) => (
              <View key={dia.data} style={dia.fimDeSemana ? styles.tableRowWeekend : styles.tableRow}>
                <Text style={styles.colData}>{formatDate(dia.data)}</Text>
                <Text style={styles.colDia}>{dia.diaSemana.substring(0, 3)}</Text>
                <Text style={styles.colHora}>{dia.entrada || (dia.fimDeSemana ? '-' : '--:--')}</Text>
                <Text style={styles.colHora}>{dia.inicioIntervalo || '-'}</Text>
                <Text style={styles.colHora}>{dia.fimIntervalo || '-'}</Text>
                <Text style={styles.colHora}>{dia.saida || (dia.fimDeSemana ? '-' : '--:--')}</Text>
                <Text style={styles.colTotal}>{dia.horasTrabalhadas !== '00:00' ? dia.horasTrabalhadas : '-'}</Text>
                <Text style={[styles.colTotal, styles.blue]}>
                  {dia.horasExtras !== '00:00' ? dia.horasExtras : '-'}
                </Text>
              </View>
            ))}
          </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text>Documento gerado em {new Date(data.geradoEm).toLocaleString('pt-BR')}</Text>
          <Text>Espelho de Ponto conforme Portaria 671 do MTE - WebPonto</Text>
        </View>
      </Page>
    </Document>
  )
}

export default EspelhoPontoPDF
