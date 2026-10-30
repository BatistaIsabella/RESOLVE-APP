// Senhas muito usadas e bases de palavras que, com número ou símbolo no fim,
// continuam fáceis de adivinhar (ex.: "Senha@123456").
export const SENHAS_COMUNS = new Set([
  '123456789012', '1234567890123', '123456789abc', 'abc123456789', 'qwertyuiop12',
  'qwertyuiop123', '111111111111', '000000000000', '123123123123', '12345678910',
  '1q2w3e4r5t6y', '1qaz2wsx3edc', 'q1w2e3r4t5y6', 'qazwsxedcrfv', 'asdfghjkl123',
  'password1234', 'password12345', 'passw0rd1234', 'p@ssw0rd1234', 'p@ssword1234',
  'senha1234567', 'senha12345678', 'minhasenha123', 'minhasenha1234', 'mudar123456',
  'trocar123456', 'admin1234567', 'administrador', 'abcd12345678', 'abcdefghijkl',
]);

export const BASES_COMUNS = new Set([
  'senha', 'senhaforte', 'minhasenha', 'senhasegura', 'password', 'passw', 'passwd',
  'admin', 'administrador', 'administrator', 'root', 'user', 'usuario', 'teste', 'test',
  'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'abc', 'abcd', 'abcdef',
  'letmein', 'welcome', 'bemvindo', 'login', 'master', 'mudar', 'trocar', 'secret',
  'segredo', 'brasil', 'brazil', 'recife', 'pernambuco', 'resolve', 'smartcity',
  'flamengo', 'corinthians', 'palmeiras', 'santacruz', 'sport', 'nautico',
  'iloveyou', 'amorzinho', 'princesa', 'dragon', 'monkey', 'football', 'futebol',
  'cidade', 'prefeitura', 'gestor', 'cidadao',
]);
