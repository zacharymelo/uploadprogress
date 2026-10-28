<?php
/* Copyright (C) 2026 Digital Properties */

/**
 * \file    core/modules/modUploadprogress.class.php
 * \ingroup uploadprogress
 * \brief   Description and activation file for module UploadProgress
 */
include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

class modUploadprogress extends DolibarrModules
{
	public function __construct($db)
	{
		global $langs, $conf;

		$this->db = $db;

		$this->numero          = 194301;
		$this->family          = 'technic';
		$this->module_position = '90';
		$this->name            = preg_replace('/^mod/i', '', get_class($this));
		$this->description     = 'Real-time file upload progress bar displayed at the bottom of the screen';
		$this->version         = '1.1.0';
		$this->const_name      = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto           = 'technic';

		$this->module_parts = array(
			'triggers'      => 0,
			'login'         => 0,
			'substitutions' => 0,
			'menus'         => 0,
			'js'            => array('/uploadprogress/js/uploadprogress.js'),
		);

		$this->dirs    = array();
		$this->hidden  = false;
		$this->depends = array();
		$this->requiredby   = array();
		$this->conflictwith = array();
		$this->langfiles    = array('uploadprogress@uploadprogress');
		$this->phpmin       = array(7, 0);
		$this->need_dolibarr_version = array(16, 0);
		$this->warnings_activation     = array();
		$this->warnings_activation_ext = array();

		$this->const       = array();
		$this->tabs        = array();
		$this->dictionaries = array();
		$this->boxes       = array();
		$this->cronjobs    = array();

		$this->rights       = array();
		$this->rights_class = 'uploadprogress';
		$this->menu         = array();

		$this->config_page_url = array('setup.php@uploadprogress');
	}

	public function init($options = '')
	{
		return $this->_init(array(), $options);
	}

	public function remove($options = '')
	{
		return $this->_remove(array(), $options);
	}
}
