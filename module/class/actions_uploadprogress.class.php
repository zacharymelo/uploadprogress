<?php
/* Copyright (C) 2026 Digital Properties */

class ActionsUploadprogress
{
	public $db;
	public $error    = '';
	public $errors   = array();
	public $results  = array();
	public $resprints = '';

	public function __construct($db)
	{
		$this->db = $db;
	}

	public function printCommonFooter($parameters, &$object, &$action, $hookmanager)
	{
		if (!isModEnabled('uploadprogress')) {
			return 0;
		}

		$jsurl    = dol_buildpath('/uploadprogress/js/uploadprogress.js', 1);
		$version  = '1.0.0';
		$debugmode = getDolGlobalInt('UPLOADPROGRESS_DEBUG_MODE') ? 'true' : 'false';

		$this->resprints  = '<script>';
		$this->resprints .= 'window.UPLOADPROGRESS_DEBUG = '.$debugmode.';';
		$this->resprints .= '</script>';
		$this->resprints .= '<script src="'.dol_escape_htmltag($jsurl).'?v='.urlencode($version).'"></script>';

		return 0;
	}
}
