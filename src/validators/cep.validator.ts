import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'CepValidator', async: false })
export class CepValidator implements ValidatorConstraintInterface {
  validate(cep: string, args: ValidationArguments) {
    cep = cep.replace(/\D/g, '');
    return cep.length === 8;
  }

  defaultMessage(args: ValidationArguments) {
    return 'CEP inválido';
  }
}