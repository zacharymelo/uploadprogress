<?php
/* Copyright (C) 2026 Digital Properties */

$res = 0;
if (!$res && file_exists("../../main.inc.php"))    { $res = @include "../../main.inc.php"; }
if (!$res && file_exists("../../../main.inc.php")) { $res = @include "../../../main.inc.php"; }
if (!$res) { die("Include of main fails"); }

require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/ajax.lib.php';

$langs->loadLangs(array('uploadprogress@uploadprogress', 'admin'));

if (!$user->admin) { accessforbidden(); }

$backtopage = GETPOST('backtopage', 'alpha');

llxHeader('', $langs->trans('UploadProgressSetup'));

$linkback = '<a href="'.($backtopage ?: DOL_URL_ROOT.'/admin/modules.php?restore_lastsearch_values=1').'">'.$langs->trans('BackToModuleList').'</a>';
print load_fiche_titre($langs->trans('UploadProgressSetup'), $linkback, 'title_setup');

print '<div class="div-table-responsive-no-min">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre">';
print '<td>'.$langs->trans('Setting').'</td>';
print '<td>'.$langs->trans('Value').'</td>';
print '<td class="opacitymedium">'.$langs->trans('Description').'</td>';
print '</tr>';

print '<tr class="oddeven">';
print '<td>'.$langs->trans('DebugMode').'</td>';
print '<td>'.ajax_constantonoff('UPLOADPROGRESS_DEBUG_MODE').'</td>';
print '<td class="opacitymedium">'.$langs->trans('DebugModeDesc', dol_buildpath('/uploadprogress/ajax/debug.php', 1)).'</td>';
print '</tr>';

print '</table>';
print '</div>';

llxFooter();
$db->close();
