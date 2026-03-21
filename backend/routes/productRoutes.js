const express = require('express');
const router  = express.Router();
const { getProducts, getCategories, getSites, getSuggestions, getStatus } = require('../controllers/productController');

router.get('/',           getProducts);
router.get('/categories', getCategories);
router.get('/sites',      getSites);
router.get('/suggestions',getSuggestions);
router.get('/status',     getStatus);

module.exports = router;
