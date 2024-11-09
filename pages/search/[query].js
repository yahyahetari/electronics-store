import { useState, useEffect } from "react";
import ProductsList from "@/components/ProductsList";
import { connectToDB } from "@/lib/mongoose";
import { Product } from "@/models/Products";
import { Category } from "@/models/Category";
import Loader from "@/components/Loader";
import { FaFilter, FaSearch, FaSortAmountDown, FaSortAmountUp, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';

export async function getServerSideProps({ params, query: urlQuery }) {
  await connectToDB();
  const { query } = params;

  const searchRegex = new RegExp(query, 'i');

  let filter = { 
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
    ]
  };
  
  if (urlQuery.minPrice || urlQuery.maxPrice) {
    filter.price = {};
    if (urlQuery.minPrice) filter.price.$gte = Number(urlQuery.minPrice);
    if (urlQuery.maxPrice) filter.price.$lte = Number(urlQuery.maxPrice);
  }

  if (urlQuery.category) {
    filter.category = urlQuery.category;
  }

  const propertyFilters = Object.keys(urlQuery).filter(key => key.startsWith('property_'));
  if (propertyFilters.length > 0) {
    filter.properties = {};
    propertyFilters.forEach(key => {
      const propertyName = key.replace('property_', '');
      filter.properties[propertyName] = urlQuery[key];
    });
  }

  const searchedProducts = await Product.find(filter, null, { sort: { '_id': -1 } });

  const searchedCategories = await Category.find({ 
    $or: [
      { name: searchRegex },
      { tags: searchRegex }
    ]
  });

  const productsInCategories = await Product.find({
    category: { $in: searchedCategories.map(cat => cat._id) },
    ...filter
  });

  const allProducts = [...searchedProducts, ...productsInCategories];
  const uniqueProducts = Array.from(new Set(allProducts.map(p => p._id.toString())))
    .map(_id => allProducts.find(p => p._id.toString() === _id));

  const allCategories = await Category.find({});

  function normalizeColor(color) {
    // Remove any extra spaces and convert to lowercase
    color = color.trim();
    
    // Handle compound colors
    if (color === 'navy blue') return 'navy';
    if (color === 'light blue') return 'lightblue';
    // Add more compound color handling as needed
    
    return color;
  }
  
  const allProperties = {};
  uniqueProducts.forEach(product => {
    if (product.properties) {
      Object.entries(product.properties).forEach(([key, value]) => {
        if (!allProperties[key]) {
          allProperties[key] = new Set();
        }
        if (key.toLowerCase() === 'color' || key.toLowerCase() === 'colors') {
          if (Array.isArray(value)) {
            value.forEach(v => allProperties[key].add(normalizeColor(v)));
          } else {
            allProperties[key].add(normalizeColor(value));
          }
        } else {
          if (Array.isArray(value)) {
            value.forEach(v => allProperties[key].add(v));
          } else {
            allProperties[key].add(value);
          }
        }
      });
    }
  });
  
  // Convert Sets to Arrays and sort them
  Object.keys(allProperties).forEach(key => {
    allProperties[key] = Array.from(allProperties[key]).sort();
  });
  

  return {
    props: {
      searchedProducts: JSON.parse(JSON.stringify(uniqueProducts)),
      categories: JSON.parse(JSON.stringify(allCategories)),
      properties: JSON.parse(JSON.stringify(allProperties)),
      query,
      filters: {
        minPrice: urlQuery.minPrice || '',
        maxPrice: urlQuery.maxPrice || '',
        category: urlQuery.category || '',
        sortOrder: urlQuery.sortOrder || '',
        ...Object.fromEntries(
          propertyFilters.map(key => [key, urlQuery[key]])
        ),
      },
    },
  };
}

export default function SearchPage({ searchedProducts, query, categories, properties, filters }) {
  const [loading, setLoading] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentFilters, setCurrentFilters] = useState(filters);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState(filters.sortOrder || '');
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    setFilteredProducts(searchedProducts);
    setLoading(false);
  }, [searchedProducts]);

  const handleFilterChange = (name, value) => {
    setCurrentFilters(prev => {
      const newFilters = { ...prev };
      if (name === 'minPrice' || name === 'maxPrice') {
        newFilters[name] = value === '' ? '' : Number(value);
      } else if (name === 'category') {
        if (!newFilters[name]) {
          newFilters[name] = [value];
        } else if (newFilters[name].includes(value)) {
          newFilters[name] = newFilters[name].filter(v => v !== value);
          if (newFilters[name].length === 0) delete newFilters[name];
        } else {
          newFilters[name] = [...newFilters[name], value];
        }
      } else {
        if (!newFilters[name]) {
          newFilters[name] = [value];
        } else if (newFilters[name].includes(value)) {
          newFilters[name] = newFilters[name].filter(v => v !== value);
          if (newFilters[name].length === 0) delete newFilters[name];
        } else {
          newFilters[name] = [...newFilters[name], value];
        }
      }
      return newFilters;
    });
  };

  const applyFilters = () => {
    setLoading(true);
  
    let filtered = searchedProducts.filter(product => {
      if (currentFilters.minPrice !== '' && product.price < Number(currentFilters.minPrice)) return false;
      if (currentFilters.maxPrice !== '' && product.price > Number(currentFilters.maxPrice)) return false;
  
      if (currentFilters.category && currentFilters.category.length > 0) {
        if (!currentFilters.category.includes(product.category)) return false;
      }
  
      for (const [key, values] of Object.entries(currentFilters)) {
        if (key.startsWith('property_') && values.length > 0) {
          const propertyName = key.replace('property_', '');
          if (!product.properties || !product.properties[propertyName]) return false;
          
          let productValue = product.properties[propertyName];
          if (propertyName.toLowerCase() === 'color') {
            productValue = Array.isArray(productValue) 
              ? productValue.map(normalizeColor) 
              : [normalizeColor(productValue)];
          } else {
            productValue = Array.isArray(productValue) ? productValue : [productValue];
          }
          
          if (!values.some(value => 
            productValue.some(pValue => 
              pValue.toString().toLowerCase() === value.toString().toLowerCase()
            )
          )) {
            return false;
          }
        }
      }
  
      return true;
    });
  
    if (sortOrder === 'asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'desc') {
      filtered.sort((a, b) => b.price - a.price);
    }
  
    setFilteredProducts(filtered);
    setLoading(false);
    setShowFilters(false);
  };
  

  const handleSortChange = (order) => {
    if (sortOrder === order) {
      // إذا تم النقر على نفس الخيار، قم بإلغاء الاختيار
      setSortOrder(null);
    } else {
      // إذا تم اختيار خيار جديد، قم بتعيينه
      setSortOrder(order);
    }
    setCurrentFilters(prev => ({ ...prev, sortOrder: order }));
  };

  const toggleSection = (sectionName) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-xl font-semibold my-2">
          {`نتائج البحث عن "${query.replace(/"/g, '&quot;')}"`}
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center bg-gray-500 text-white text-lg px-4 py-2 rounded-lg hover:bg-primary-dark transition"
        >
          <FaFilter className="mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="col-span-1 bg-gray-500 p-4 rounded-lg shadow-lg"
            >
              <h2 className="text-xl font-semibold mb-4 text-white">Filters</h2>

              {/* Price filter */}
              <div className="mb-4">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('price')}>
                  <label className="block text-base font-semibold  text-white">Price Range</label>
                  {openSections['price'] ? <FaChevronUp className="text-white" /> : <FaChevronDown className="text-white" />}
                </div>
                {openSections['price'] && (
                  <div className="flex space-x-2 mt-2">
                    <input
                      type="number"
                      name="minPrice"
                      placeholder="Min"
                      value={currentFilters.minPrice === '' ? '' : currentFilters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="w-1/2 border rounded p-2 bg-white"
                    />
                    <input
                      type="number"
                      name="maxPrice"
                      placeholder="Max"
                      value={currentFilters.maxPrice === '' ? '' : currentFilters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="w-1/2 border rounded p-2 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Categories filter */}
              <div className="mb-4">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('categories')}>
                  <h3 className="font-semibold text-lg mb-2 text-white">Categories</h3>
                  {openSections['categories'] ? <FaChevronUp className="text-white" /> : <FaChevronDown className="text-white" />}
                </div>
                {openSections['categories'] && (
                  <div className="space-y-2 mt-2">
                    {categories.map(cat => (
                      <label key={cat._id} className="flex items-center text-white">
                        <input
                          type="checkbox"
                          checked={currentFilters.category?.includes(cat._id)}
                          onChange={() => handleFilterChange('category', cat._id)}
                          className="mr-2"
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Properties filter */}
              {Object.entries(properties).map(([propertyName, values]) => (
                <div key={propertyName} className="mb-4">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection(propertyName)}>
                    <h3 className="font-semibold text-lg mb-2 text-white">{propertyName}</h3>
                    {openSections[propertyName] ? <FaChevronUp className="text-white" /> : <FaChevronDown className="text-white" />}
                  </div>
                  {openSections[propertyName] && (
                    <div className="space-y-2 mt-2">
                      {values.map(value => (
                        <label key={value} className="flex items-center text-white">
                          <input
                            type="checkbox"
                            checked={currentFilters[`property_${propertyName}`]?.includes(value)}
                            onChange={() => handleFilterChange(`property_${propertyName}`, value)}
                            className="mr-2"
                          />
                          <span className="text-base">{value}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Sort order */}
              <div className="mb-4">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('sortOrder')}>
                  <h3 className="font-semibold mb-2 text-lg text-white">Sort Order</h3>
                  {openSections['sortOrder'] ? <FaChevronUp className="text-white" /> : <FaChevronDown className="text-white" />}
                </div>
                {openSections['sortOrder'] && (
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center text-base text-white">
                      <input
                        type="checkbox"
                        checked={sortOrder === 'asc'}
                        onChange={() => handleSortChange('asc')}
                        className="mr-2"
                      />
                      <FaSortAmountUp className="mr-2 text-sm" />
                      Price: Low to High
                    </label>
                    <label className="flex items-center text-base text-white">
                      <input
                        type="checkbox"
                        checked={sortOrder === 'desc'}
                        onChange={() => handleSortChange('desc')}
                        className="mr-2"
                      />
                      <FaSortAmountDown className="mr-2 text-sm" />
                      Price: High to Low
                    </label>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={applyFilters}
                className="w-full bg-accent text-teal-800 text-xl font-bold p-2 rounded-lg hover:bg-accent-dark transition"
              >
                Apply Filters
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`col-span-1 ${showFilters ? 'md:col-span-3' : 'md:col-span-4'}`}>
          {filteredProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-8"
            >
              <FaSearch className="mx-auto text-4xl text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold">No results found</h2>
              <p className="text-gray-600 mt-2">Try adjusting your search criteria</p>
            </motion.div>
          ) : (
            <ProductsList products={filteredProducts} />
          )}
        </div>
      </div>
    </div>
  );
}
