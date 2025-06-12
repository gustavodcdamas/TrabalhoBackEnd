// cpf.validator.ts (Backend)
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'cpfValidator', async: false })
export class CpfValidator implements ValidatorConstraintInterface {
  validate(cpf: string, args: ValidationArguments) {
    if (!cpf) return true; // Se não fornecido, consideramos válido (use @IsNotEmpty se obrigatório)

    // Remove caracteres não numéricos
    const cleanCpf = cpf.replace(/\D/g, '');

    // Verifica se tem 11 dígitos
    if (cleanCpf.length !== 11) return false;

    // Verifica se todos os dígitos são iguais (CPF inválido)
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto < 2 ? 0 : resto;

    if (parseInt(cleanCpf.charAt(9)) !== digito1) return false;

    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto < 2 ? 0 : resto;

    if (parseInt(cleanCpf.charAt(10)) !== digito2) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'CPF inválido';
  }
}