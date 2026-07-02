<?php
/* Copyright (C) 2026 Digital Properties */

/**
 * \file    core/modules/modUploadprogress.class.php
 * \ingroup uploadprogress
 * \brief   Module descriptor for Upload Progress
 */

include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

class modUploadprogress extends DolibarrModules
{
	public function __construct($db)
	{
		global $langs, $conf;
		parent::__construct($db);

		$this->numero        = 598898;
		$this->rights_class  = 'uploadprogress';
		$this->family        = 'technic';
		$this->module_position = '90';
		$this->name          = preg_replace('/^mod/i', '', get_class($this));
		$this->description   = 'Real-time file upload progress bar displayed at the bottom of the screen';
		$this->version       = '1.0.0';
		$this->picto         = 'technic';

		$this->module_parts = array(
			'hooks' => array(
				'data'   => array('printCommonFooter'),
				'entity' => '0',
			),
		);

		$this->depends      = array();
		$this->requiredby   = array();
		$this->langfiles    = array('uploadprogress@uploadprogress');
		$this->phpmin       = array(7, 0);
		$this->need_dolibarr_version = array(16, 0);
		$this->config_page_url = array('setup.php@uploadprogress');
	}

	public function init($options = '')
	{
		$this->delete_menus();
		return $this->_init(array(), $options);
	}

	public function remove($options = '')
	{
		return $this->_remove(array(), $options);
	}
}
