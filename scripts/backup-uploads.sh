#!/bin/bash

# Script para gerenciar uploads

# Criar backup dos uploads
backup_uploads() {
    echo "Criando backup dos uploads..."
    docker exec agencia-backend tar -czf /tmp/uploads-backup-$(date +%Y%m%d_%H%M%S).tar.gz -C /usr/src/app uploads
    docker cp agencia-backend:/tmp/uploads-backup-$(date +%Y%m%d_%H%M%S).tar.gz ./backups/
    echo "Backup criado em ./backups/"
}

# Restaurar backup dos uploads
restore_uploads() {
    if [ -z "$1" ]; then
        echo "Uso: restore_uploads <arquivo-backup.tar.gz>"
        return 1
    fi
    
    echo "Restaurando uploads de $1..."
    docker cp "$1" agencia-backend:/tmp/restore.tar.gz
    docker exec agencia-backend tar -xzf /tmp/restore.tar.gz -C /usr/src/app
    docker exec agencia-backend rm /tmp/restore.tar.gz
    echo "Uploads restaurados!"
}

# Limpar uploads antigos (mais de 30 dias)
clean_old_uploads() {
    echo "Limpando uploads antigos..."
    docker exec agencia-backend find /usr/src/app/uploads -type f -mtime +30 -delete
    echo "Limpeza concluída!"
}

# Listar uploads
list_uploads() {
    echo "Listando uploads..."
    docker exec agencia-backend ls -la /usr/src/app/uploads
}

# Verificar espaço usado
check_space() {
    echo "Espaço usado pelos uploads:"
    docker exec agencia-backend du -sh /usr/src/app/uploads
}

# Menu principal
case "$1" in
    backup)
        backup_uploads
        ;;
    restore)
        restore_uploads "$2"
        ;;
    clean)
        clean_old_uploads
        ;;
    list)
        list_uploads
        ;;
    space)
        check_space
        ;;
    *)
        echo "Uso: $0 {backup|restore|clean|list|space}"
        echo "  backup       - Cria backup dos uploads"
        echo "  restore FILE - Restaura uploads de um backup"
        echo "  clean        - Remove uploads com mais de 30 dias"
        echo "  list         - Lista arquivos de upload"
        echo "  space        - Mostra espaço usado"
        ;;
esac