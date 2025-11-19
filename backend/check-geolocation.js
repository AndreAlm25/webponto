const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Função para calcular distância entre dois pontos (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distância em metros
}

async function checkGeolocation() {
  try {
    console.log('\n🗺️  VERIFICAÇÃO DE GEOLOCALIZAÇÃO\n')
    console.log('=' .repeat(80))

    // 1. Buscar cerca do funcionário
    const employee = await prisma.employee.findFirst({
      where: {
        user: {
          email: 'joao.silva@acmetech.com.br'
        }
      },
      include: {
        geofence: true,
        user: true
      }
    })

    if (!employee) {
      console.log('❌ Funcionário não encontrado')
      return
    }

    console.log('\n👤 FUNCIONÁRIO:')
    console.log(`   Nome: ${employee.user.name}`)
    console.log(`   Email: ${employee.user.email}`)
    console.log(`   ID: ${employee.id}`)

    if (employee.geofence) {
      console.log('\n📍 CERCA GEOGRÁFICA:')
      console.log(`   Nome: ${employee.geofence.name}`)
      console.log(`   Centro: ${employee.geofence.centerLat}, ${employee.geofence.centerLng}`)
      console.log(`   Raio: ${employee.geofence.radiusMeters}m`)
      console.log(`   Ativa: ${employee.geofence.active}`)
    } else {
      console.log('\n⚠️  SEM CERCA GEOGRÁFICA ASSOCIADA')
    }

    // 2. Buscar últimas tentativas de ponto (com ou sem sucesso)
    const recentEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId: employee.id
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 5
    })

    console.log('\n📊 ÚLTIMAS BATIDAS DE PONTO:')
    console.log('-'.repeat(80))

    if (recentEntries.length === 0) {
      console.log('   Nenhuma batida de ponto registrada ainda')
    } else {
      recentEntries.forEach((entry, index) => {
        console.log(`\n   ${index + 1}. ${entry.type} - ${entry.timestamp.toLocaleString('pt-BR')}`)
        console.log(`      Localização: ${entry.latitude}, ${entry.longitude}`)
        console.log(`      Precisão: ${entry.accuracy ? Math.round(entry.accuracy) + 'm' : 'N/A'}`)
        console.log(`      Método: ${entry.geoMethod || 'N/A'}`)
        
        if (employee.geofence && entry.latitude && entry.longitude) {
          const distance = calculateDistance(
            employee.geofence.centerLat,
            employee.geofence.centerLng,
            entry.latitude,
            entry.longitude
          )
          const withinFence = distance <= employee.geofence.radiusMeters
          console.log(`      Distância da cerca: ${Math.round(distance)}m ${withinFence ? '✅ DENTRO' : '❌ FORA'}`)
        }
      })
    }

    // 3. Mostrar coordenadas que chegaram no último erro
    console.log('\n\n🔍 ÚLTIMA TENTATIVA (do log do backend):')
    console.log('   Localização enviada: -23.691264, -46.792704')
    
    if (employee.geofence) {
      const distance = calculateDistance(
        employee.geofence.centerLat,
        employee.geofence.centerLng,
        -23.691264,
        -46.792704
      )
      console.log(`   Distância da cerca: ${Math.round(distance)}m`)
      console.log(`   Raio da cerca: ${employee.geofence.radiusMeters}m`)
      console.log(`   Status: ${distance <= employee.geofence.radiusMeters ? '✅ DENTRO' : '❌ FORA'}`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n💡 DICAS:')
    console.log('   1. A localização é capturada TODA VEZ que bate ponto')
    console.log('   2. Não fica salva no cadastro do funcionário')
    console.log('   3. Cada batida de ponto salva sua própria localização')
    console.log('   4. O navegador pode ter precisão ruim (até 1km de erro!)')
    console.log('   5. Use GPS do celular para maior precisão')
    console.log('\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkGeolocation()
