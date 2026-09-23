<?php
require_once __DIR__ . '/bootstrap.php';

test_case('HR can save, reload, update and delete saved CV screening criteria', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $presetName = 'QA-E2E-Preset-' . uniqid();

    $hrEmail = qa_email('cvpreset_hr');
    $conn->query("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'PresetHr', '$hrEmail', '$hash', 'Human Resources')");
    $hrId = $conn->insert_id;

    $candidateEmail = qa_email('cvpreset_candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'PresetCandidate', '$candidateEmail', '$hash')");
    $candidateId = $conn->insert_id;

    $hrJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $hrEmail, 'password' => $password], $hrJar);

    $candidateJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $candidateEmail, 'password' => $password], $candidateJar);

    $payload = ['name' => $presetName, 'must_skills' => 'PHP, MySQL', 'nice_skills' => 'Docker', 'min_years' => 3];

    $anon = http_post_json('/api/save_cv_preset.php', $payload, new_cookie_jar());
    assert_true($anon['success'] === false, 'Saving criteria requires an HR login (anonymous is rejected)');

    $asCandidate = http_post_json('/api/save_cv_preset.php', $payload, $candidateJar);
    assert_true($asCandidate['success'] === false, 'A candidate session cannot save HR screening criteria');

    $noName = http_post_json('/api/save_cv_preset.php', ['name' => '  ', 'must_skills' => 'PHP', 'nice_skills' => '', 'min_years' => 0], $hrJar);
    assert_true($noName['success'] === false, 'Criteria without a name are rejected');

    $noSkills = http_post_json('/api/save_cv_preset.php', ['name' => $presetName, 'must_skills' => '', 'nice_skills' => '', 'min_years' => 2], $hrJar);
    assert_true($noSkills['success'] === false, 'Criteria with no skills at all are rejected');

    $saved = http_post_json('/api/save_cv_preset.php', $payload, $hrJar);
    assert_true($saved['success'] === true && $saved['id'] > 0, 'HR can save named criteria');
    $presetId = $saved['id'];

    $list = http_get('/api/get_cv_presets.php', $hrJar);
    $found = null;
    foreach ($list['data'] as $p) {
        if ($p['id'] === $presetId) $found = $p;
    }
    assert_true($found !== null, 'Saved criteria appear in the saved list');
    assert_true($found['must_skills'] === 'PHP, MySQL' && $found['nice_skills'] === 'Docker' && $found['min_years'] === 3, 'All three fields (must-have, nice-to-have, minimum years) reload exactly as saved');

    $anonList = http_get('/api/get_cv_presets.php', new_cookie_jar());
    assert_true($anonList['success'] === false, 'The saved list is not readable without an HR login');

    $payload['must_skills'] = 'PHP, MySQL, Redis';
    $payload['min_years'] = 5;
    $updated = http_post_json('/api/save_cv_preset.php', $payload, $hrJar);
    assert_true($updated['success'] === true && $updated['id'] === $presetId, 'Saving under an existing name updates that entry instead of creating a duplicate');

    $count = $conn->query("SELECT COUNT(*) AS c FROM cv_screening_presets WHERE name = '$presetName'")->fetch_assoc()['c'];
    assert_true((int)$count === 1, 'Still exactly one entry with that name after updating');

    $reloaded = http_get('/api/get_cv_presets.php', $hrJar);
    foreach ($reloaded['data'] as $p) {
        if ($p['id'] === $presetId) $found = $p;
    }
    assert_true($found['must_skills'] === 'PHP, MySQL, Redis' && $found['min_years'] === 5, 'The updated values are what reloads next time');

    $deniedDelete = http_post_json('/api/delete_cv_preset.php', ['id' => $presetId], $candidateJar);
    assert_true($deniedDelete['success'] === false, 'A candidate session cannot delete saved criteria');

    $deleted = http_post_json('/api/delete_cv_preset.php', ['id' => $presetId], $hrJar);
    assert_true($deleted['success'] === true, 'HR can delete saved criteria');

    $gone = $conn->query("SELECT COUNT(*) AS c FROM cv_screening_presets WHERE id = $presetId")->fetch_assoc()['c'];
    assert_true((int)$gone === 0, 'The deleted entry is really gone');

    @unlink($hrJar);
    @unlink($candidateJar);
    $conn->query("DELETE FROM cv_screening_presets WHERE name LIKE 'QA-E2E-Preset-%'");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM hr_admins WHERE id = $hrId");
});
