-- Limpar dados existentes
TRUNCATE TABLE pontos CASCADE;
TRUNCATE TABLE funcionarios CASCADE;
TRUNCATE TABLE usuarios CASCADE;
TRUNCATE TABLE empresas CASCADE;

-- Inserir empresa
INSERT INTO empresas (id, cnpj, "razaoSocial", "nomeFantasia", email, ativo, "createdAt", "updatedAt")
VALUES (1, '12345678000100', 'Empresa Teste LTDA', 'Empresa Teste', 'contato@empresateste.com.br', true, NOW(), NOW());

-- Inserir usuário admin
INSERT INTO usuarios (id, "empresaId", email, senha, nome, role, ativo, "createdAt", "updatedAt")
VALUES (1, 1, 'joao.silva@empresateste.com.br', '$2b$10$abcdefghijklmnopqrstuv', 'João Silva', 'FUNCIONARIO', true, NOW(), NOW());

-- Inserir funcionário
INSERT INTO funcionarios (id, "empresaId", "usuarioId", matricula, nome, cpf, "dataAdmissao", "salarioBase", "faceId", "faceRegistrada", ativo, "createdAt", "updatedAt")
VALUES (1, 1, 1, 'FUNC001', 'João Silva', '12345678901', '2024-01-01', 3000.00, NULL, false, true, NOW(), NOW());

-- Reset sequences
SELECT setval('empresas_id_seq', 1, true);
SELECT setval('usuarios_id_seq', 1, true);
SELECT setval('funcionarios_id_seq', 1, true);
SELECT setval('pontos_id_seq', 1, false);
