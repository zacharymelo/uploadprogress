<?php
/* Copyright (C) 2026 Digital Properties */

$res = 0;
if (!$res && file_exists("../../main.inc.php"))      { $res = @include "../../main.inc.php"; }
if (!$res && file_exists("../../../main.inc.php"))   { $res = @include "../../../main.inc.php"; }
if (!$res && file_exists("../../../../main.inc.php")){ $res = @include "../../../../main.inc.php"; }
if (!$res) { http_response_code(500); exit; }

if (!$user->admin) { http_response_code(403); print 'Admin only'; exit; }
if (!getDolGlobalInt('UPLOADPROGRESS_DEBUG_MODE')) {
	http_response_code(403);
	print 'Debug mode not enabled. Go to Upload Progress > Setup and enable Debug Mode.';
	exit;
}

header('Content-Type: text/plain; charset=utf-8');

print "=== UPLOADPROGRESS DEBUG DIAGNOSTICS ===\n";
print "Timestamp: ".date('Y-m-d H:i:s T')."\n";
print "Dolibarr: ".(defined('DOL_VERSION') ? DOL_VERSION : 'unknown')."\n\n";

print "--- MODULE STATUS ---\n";
print "isModEnabled('uploadprogress'): ".(isModEnabled('uploadprogress') ? 'YES' : 'NO')."\n\n";

print "--- HOOK REGISTRATION ---\n";
$sql = "SELECT name, value FROM ".MAIN_DB_PREFIX."const"
	." WHERE name = 'MAIN_MODULE_UPLOADPROGRESS_HOOKS'"
	." AND entity IN (0, ".((int) $conf->entity).")";
$resql = $db->query($sql);
if ($resql && ($row = $db->fetch_object($resql))) {
	print "MAIN_MODULE_UPLOADPROGRESS_HOOKS = $row->value\n";
} else {
	print "MAIN_MODULE_UPLOADPROGRESS_HOOKS = (not found — module may not be enabled)\n";
}

print "\nhookmanager contexts registered for uploadprogress:\n";
if (isset($conf->modules_parts['hooks'])) {
	$found = false;
	foreach ($conf->modules_parts['hooks'] as $context => $modules) {
		$list = is_array($modules) ? $modules : array($modules);
		foreach ($list as $mod) {
			if (stripos($mod, 'uploadprogress') !== false) {
				print "  context='$context' module='$mod'\n";
				$found = true;
			}
		}
	}
	if (!$found) print "  (none — check module is enabled and hooks are registered)\n";
}

print "\n--- SETTINGS ---\n";
$sql2 = "SELECT name, value FROM ".MAIN_DB_PREFIX."const"
	." WHERE name LIKE 'UPLOADPROGRESS%'"
	." AND entity IN (0, ".((int) $conf->entity).")"
	." ORDER BY name";
$resql2 = $db->query($sql2);
if ($resql2) {
	$cnt = 0;
	while ($row = $db->fetch_object($resql2)) {
		print "  $row->name = $row->value\n";
		$cnt++;
	}
	if (!$cnt) print "  (none)\n";
}

print "\n--- ACTIONS CLASS ---\n";
$actionsFile = DOL_DOCUMENT_ROOT.'/custom/uploadprogress/class/actions_uploadprogress.class.php';
print "File exists: ".(file_exists($actionsFile) ? 'YES' : 'NO')."\n";
if (file_exists($actionsFile)) {
	include_once $actionsFile;
	print "Class ActionsUploadprogress: ".(class_exists('ActionsUploadprogress') ? 'YES' : 'NO')."\n";
	if (class_exists('ActionsUploadprogress')) {
		print "method printCommonFooter: ".(method_exists('ActionsUploadprogress', 'printCommonFooter') ? 'defined' : 'MISSING')."\n";
	}
}

print "\n--- JS FILE ---\n";
$jsFile = DOL_DOCUMENT_ROOT.'/custom/uploadprogress/js/uploadprogress.js';
print "File exists: ".(file_exists($jsFile) ? 'YES' : 'NO')."\n";
if (file_exists($jsFile)) {
	print "File size: ".filesize($jsFile)." bytes\n";
}
print "Public URL: ".dol_buildpath('/uploadprogress/js/uploadprogress.js', 1)."\n";

print "\n=== END DEBUG ===\n";
