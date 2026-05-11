<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajustar para produccion

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

function public_url_for_file($filename) {
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $publicPath = ($scriptDir === '' ? '' : $scriptDir) . '/uploads/' . rawurlencode($filename);
    return $scheme . '://' . $host . $publicPath;
}

function filename_from_public_url($url) {
    $path = parse_url($url, PHP_URL_PATH);
    if (!$path) return null;

    $filename = basename($path);
    if ($filename === '' || $filename === '.' || $filename === '..') return null;

    return preg_replace('/[^a-zA-Z0-9._-]/', '', rawurldecode($filename));
}

function validate_image_upload($file) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No se pudo recibir la imagen']);
        exit;
    }

    $mime = mime_content_type($file['tmp_name']);
    if (strpos($mime, 'image/') !== 0) {
        http_response_code(415);
        echo json_encode(['error' => 'El archivo debe ser una imagen']);
        exit;
    }

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    if (!in_array($extension, $allowedExtensions, true)) {
        http_response_code(415);
        echo json_encode(['error' => 'Formato de imagen no permitido']);
        exit;
    }

    return $extension;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    $filename = filename_from_public_url($_POST['url'] ?? '');
    if (!$filename) {
        http_response_code(400);
        echo json_encode(['error' => 'URL de imagen invalida']);
        exit;
    }

    $targetPath = $uploadDir . $filename;
    if (is_file($targetPath) && !unlink($targetPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo eliminar la imagen']);
        exit;
    }

    echo json_encode(['deleted' => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    $file = $_FILES['image'];
    $extension = validate_image_upload($file);

    $targetFilename = filename_from_public_url($_POST['target_url'] ?? '');
    if ($targetFilename) {
        $targetExtension = strtolower(pathinfo($targetFilename, PATHINFO_EXTENSION));
        if ($targetExtension !== $extension) {
            http_response_code(415);
            echo json_encode(['error' => 'La extension restaurada no coincide con la imagen']);
            exit;
        }
        $filename = $targetFilename;
    } else {
        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $filename = time() . '_' . bin2hex(random_bytes(4)) . '_' . $safeName . '.' . $extension;
    }

    $targetPath = $uploadDir . $filename;
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode(['url' => public_url_for_file($filename)]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar la imagen']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibio ninguna imagen']);
}
?>
