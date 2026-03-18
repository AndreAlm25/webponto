'use client'

import ExcelJS from 'exceljs'

// Estilos padrão para cabeçalho
const headerStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  },
}

// Estilos padrão para dados
const dataStyle: Partial<ExcelJS.Style> = {
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: {
    top: { style: 'thin', color: { argb: 'FFE5E5E5' } },
    left: { style: 'thin', color: { argb: 'FFE5E5E5' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } },
    right: { style: 'thin', color: { argb: 'FFE5E5E5' } },
  },
}

// Estilo para linhas alternadas
const alternateRowStyle: Partial<ExcelJS.Style> = {
  ...dataStyle,
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } },
}

// Aplicar estilo de cabeçalho
function applyHeaderStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.style = headerStyle as ExcelJS.Style
  })
  row.height = 25
}

// Aplicar estilo de dados
function applyDataStyle(row: ExcelJS.Row, isAlternate: boolean = false): void {
  const style = isAlternate ? alternateRowStyle : dataStyle
  row.eachCell((cell) => {
    cell.style = { ...cell.style, ...style } as ExcelJS.Style
  })
  row.height = 20
}

// Auto-ajustar largura das colunas
function autoFitColumns(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns.forEach((column) => {
    let maxLength = 10
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value?.toString() || ''
      maxLength = Math.max(maxLength, cellValue.length + 2)
    })
    column.width = Math.min(maxLength, 50)
  })
}

// Baixar arquivo Excel
async function downloadExcel(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  a.remove()
}

// Mapear tipos de ponto para português
const tipoMap: Record<string, string> = {
  'CLOCK_IN': 'Entrada',
  'BREAK_START': 'Início Intervalo',
  'BREAK_END': 'Fim Intervalo',
  'CLOCK_OUT': 'Saída',
}

// Exportar registros de ponto para Excel
export async function exportarRegistrosExcel(registros: any[], filename?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'WebPonto'
  workbook.created = new Date()
  
  const worksheet = workbook.addWorksheet('Registros de Ponto')

  // Definir colunas
  worksheet.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Funcionário', key: 'funcionario', width: 25 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Método', key: 'metodo', width: 15 },
    { header: 'Localização', key: 'localizacao', width: 20 },
    { header: 'Observações', key: 'observacoes', width: 30 },
  ]

  // Aplicar estilo ao cabeçalho
  applyHeaderStyle(worksheet.getRow(1))

  // Adicionar dados
  registros.forEach((registro: any, index: number) => {
    const date = new Date(registro.timestamp)
    const row = worksheet.addRow({
      data: date.toLocaleDateString('pt-BR'),
      hora: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      funcionario: registro.employee?.user?.name || registro.employee?.name || 'N/A',
      tipo: tipoMap[registro.type] || registro.type,
      metodo: registro.source === 'FACIAL' ? 'Facial' : 'Manual',
      localizacao: registro.latitude && registro.longitude 
        ? `${registro.latitude.toFixed(4)}, ${registro.longitude.toFixed(4)}` 
        : 'N/A',
      observacoes: registro.notes || '',
    })
    applyDataStyle(row, index % 2 === 1)
  })

  // Auto-ajustar colunas
  autoFitColumns(worksheet)

  // Baixar arquivo
  const defaultFilename = `registros-ponto-${new Date().toISOString().split('T')[0]}.xlsx`
  await downloadExcel(workbook, filename || defaultFilename)
}

// Exportar espelho de ponto para Excel
export async function exportarEspelhoExcel(espelho: any, filename?: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'WebPonto'
  workbook.created = new Date()
  
  // Aba 1: Resumo
  const wsResumo = workbook.addWorksheet('Resumo')
  wsResumo.columns = [
    { header: 'Campo', key: 'campo', width: 25 },
    { header: 'Valor', key: 'valor', width: 30 },
  ]
  applyHeaderStyle(wsResumo.getRow(1))

  // Dados do funcionário e resumo
  const dadosResumo = [
    { campo: 'Funcionário', valor: espelho.funcionario.nome },
    { campo: 'CPF', valor: espelho.funcionario.cpf },
    { campo: 'Matrícula', valor: espelho.funcionario.matricula },
    { campo: 'Cargo', valor: espelho.funcionario.cargo },
    { campo: 'Departamento', valor: espelho.funcionario.departamento },
    { campo: 'Jornada Diária', valor: espelho.funcionario.jornadaDiaria },
    { campo: '', valor: '' },
    { campo: 'Empresa', valor: espelho.empresa.nomeFantasia },
    { campo: 'CNPJ', valor: espelho.empresa.cnpj },
    { campo: '', valor: '' },
    { campo: 'Período', valor: espelho.periodo.mesAno },
    { campo: '', valor: '' },
    { campo: 'Dias Úteis', valor: espelho.resumo.diasUteis },
    { campo: 'Dias Trabalhados', valor: espelho.resumo.diasTrabalhados },
    { campo: 'Faltas', valor: espelho.resumo.faltas },
    { campo: 'Atrasos', valor: espelho.resumo.atrasos },
    { campo: '', valor: '' },
    { campo: 'Jornada Esperada', valor: espelho.resumo.jornadaEsperada },
    { campo: 'Horas Trabalhadas', valor: espelho.resumo.totalHorasTrabalhadas },
    { campo: 'Horas Extras', valor: espelho.resumo.totalHorasExtras },
    { campo: 'Horas Noturnas', valor: espelho.resumo.totalHorasNoturnas },
    { campo: 'Saldo', valor: `${espelho.resumo.saldoPositivo ? '+' : '-'}${espelho.resumo.saldo}` },
  ]

  dadosResumo.forEach((item, index) => {
    const row = wsResumo.addRow(item)
    applyDataStyle(row, index % 2 === 1)
  })

  // Aba 2: Detalhamento Diário
  const wsDetalhe = workbook.addWorksheet('Detalhamento Diário')
  wsDetalhe.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Dia', key: 'dia', width: 10 },
    { header: 'Entrada', key: 'entrada', width: 10 },
    { header: 'Iníc. Int.', key: 'inicioIntervalo', width: 10 },
    { header: 'Fim Int.', key: 'fimIntervalo', width: 10 },
    { header: 'Saída', key: 'saida', width: 10 },
    { header: 'Trabalhado', key: 'trabalhado', width: 12 },
    { header: 'Extras', key: 'extras', width: 10 },
  ]
  applyHeaderStyle(wsDetalhe.getRow(1))

  espelho.dias.forEach((dia: any, index: number) => {
    const row = wsDetalhe.addRow({
      data: new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dia: dia.diaSemana.substring(0, 3),
      entrada: dia.entrada || '-',
      inicioIntervalo: dia.inicioIntervalo || '-',
      fimIntervalo: dia.fimIntervalo || '-',
      saida: dia.saida || '-',
      trabalhado: dia.horasTrabalhadas !== '00:00' ? dia.horasTrabalhadas : '-',
      extras: dia.horasExtras !== '00:00' ? dia.horasExtras : '-',
    })
    applyDataStyle(row, index % 2 === 1)
  })

  autoFitColumns(wsDetalhe)

  // Baixar arquivo
  const nomeArquivo = espelho.funcionario.nome.replace(/\s+/g, '-').toLowerCase()
  const defaultFilename = `espelho-ponto-${nomeArquivo}-${espelho.periodo.mesAno.replace('/', '-')}.xlsx`
  await downloadExcel(workbook, filename || defaultFilename)
}
