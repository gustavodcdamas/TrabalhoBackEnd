# {Back End Agencia}

Este repositório contém o back end do projeto desenvolvido utilizando NestJS(Node.js), Angular e TypeScript. Neste arquivo README, você encontrará um guia passo a passo para abrir o projeto em seu ambiente local.

O front end se encontra em: `https://github.com/gustavodcdamas/TrabalhoFrontEnd/`

## Pré-requisitos

Antes de começar, verifique se você possui as seguintes ferramentas instaladas em sua máquina:

- Node.js (versão 12 ou superior)
- npm (gerenciador de pacotes do Node.js)
- Angular Instalado
- NestJS Instalado
- Docker Instalado

## Passo 1: Clonar o Front End

Comece clonando o fornt end para sua máquina local. Abra o terminal e execute o seguinte comando:

```bash
git clone `https://github.com/gustavodcdamas/TrabalhoBackEnd`
```

Isso criará uma cópia local do repositório em seu ambiente.

## Passo 2: Configurar variáveis de ambiente

O projeto pode exigir algumas variáveis de ambiente para funcionar corretamente. Existe um arquivo `.env.example` no diretório raiz do projeto. Faça uma cópia desse arquivo e renomeie-o para `.env`. Em seguida, atualize as variáveis de ambiente de acordo com as configurações do seu ambiente local. O arquivo .env.example j;a vem com uma configuração padrão que permite o funcionamento da aplicação perfeitamente, sem necessariamente ter que alterar nenhuma variável de ambiente.

## Passo 4: Iniciar o servidor

Para iniciar o servidor Docker, execute o seguinte comando:

```bash
docker compose up -d
```

Isso iniciará o servidor e você poderá acessá-lo através do seu navegador no endereço `http://localhost:3333`.

A documentação da api se encontra em: `http://localhost:3333/api/docs`

---
