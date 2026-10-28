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

print "--- JS INJECTION (module_parts['js']) ---\n";
$sql = "SELECT name, value FROM ".MAIN_DB_PREFIX."const"
	." WHERE name = 'MAIN_MODULE_UPLOADPROGRESS_JS'"
	." AND entity IN (0, ".((int) $conf->entity).")";
$resql = $db->query($sql);
if ($resql && ($row = $db->fetch_object($resql))) {
	print "MAIN_MODULE_UPLOADPROGRESS_JS = $row->value\n";
} else {
	print "MAIN_MODULE_UPLOADPROGRESS_JS = (not found — module may not be enabled)\n";
}

print "\nmodules_parts['js'] for uploadprogress:\n";
if (!empty($conf->modules_parts['js']['uploadprogress'])) {
	foreach ((array) $conf->modules_parts['js']['uploadprogress'] as $jsfile) {
		$url = dol_buildpath($jsfile, 1);
		print "  $jsfile => $url (".(file_exists(dol_buildpath($jsfile, 0)) ? 'file exists' : 'FILE MISSING').")\n";
	}
} else {
	print "  (not registered — disable and re-enable the module)\n";
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
$actionsFile = dol_buildpath('/uploadprogress/class/actions_uploadprogress.class.php', 0);
print "File exists: ".(file_exists($actionsFile) ? 'YES' : 'NO')."\n";
if (file_exists($actionsFile)) {
	include_once $actionsFile;
	print "Class ActionsUploadprogress: ".(class_exists('ActionsUploadprogress') ? 'YES' : 'NO')."\n";
	if (class_exists('ActionsUploadprogress')) {
		print "method printCommonFooter: ".(method_exists('ActionsUploadprogress', 'printCommonFooter') ? 'defined' : 'MISSING')."\n";
	}
}

print "\n--- JS FILE ---\n";
$jsFile = dol_buildpath('/uploadprogress/js/uploadprogress.js', 0);
print "File exists: ".(file_exists($jsFile) ? 'YES' : 'NO')."\n";
if (file_exists($jsFile)) {
	print "File size: ".filesize($jsFile)." bytes\n";
}
print "Public URL: ".dol_buildpath('/uploadprogress/js/uploadprogress.js', 1)."\n";

print "\n=== END DEBUG ===\n";
