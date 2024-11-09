import { useState, useContext, useEffect } from 'react';
import { CartContext } from './CartContext';
import { motion } from 'framer-motion';
import { MinusCircle, PlusCircle, X, Star } from 'lucide-react';
import Image from 'next/image';
import { useSwipeable } from 'react-swipeable';

const getColorHex = (colorName) => {
    const colors = {
        "أحمر": "#FF0000",
        "أزرق": "#020e77",
        "أخضر": "#0a7900",
        "أصفر": "#FFFF00",
        "أسود": "#000000",
        "أبيض": "#FFFFFF",
        "بني": "#964B00",
        "رمادي": "#808080",
        "برتقالي": "#FFA500",
        "وردي": "#FFC0CB",
        "بنفسجي": "#800080",
        "ذهبي": "#FFD700",
        "فضي": "#C0C0C0",
        "بيج": "#F5F5DC",
        "كحلي": "#000080",
        "نيلي": "#1F305E",
        "زيتي": "#808000",
        "نحاسي": "#B87333",
        "عنابي": "#800000",
        "تركواز": "#40E0D0"
    };
    return colors[colorName] || colorName;
};

const QuickAddToCart = ({ product, onClose, ratings }) => {
    const { addToCart } = useContext(CartContext);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedProperties, setSelectedProperties] = useState({});
    const [quantity, setQuantity] = useState(1);
    const [mainImage, setMainImage] = useState(product.images[0]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (product.variants[0]?.properties) {
            const initialSelected = {};
            Object.entries(product.variants[0].properties).forEach(([key, values]) => {
                if (Array.isArray(values) && values.length > 0) {
                    initialSelected[key] = values[0];
                }
            });
            const firstValidVariant = findMatchingVariant(initialSelected);
            if (firstValidVariant) {
                setSelectedProperties(initialSelected);
                setSelectedVariant(firstValidVariant);
            }
        }
        setMainImage(product.images[0]);

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, [product]);

    const findMatchingVariant = (properties) => {
        return product.variants.find(variant => {
            return Object.entries(properties).every(([key, value]) => {
                return variant.properties[key]?.includes(value);
            });
        }) || null;
    };

    const isValidCombination = (properties) => {
        return product.variants.some(variant => {
            return Object.entries(properties).every(([key, value]) => {
                return variant.properties[key]?.includes(value);
            });
        });
    };

    const toggleProperty = (name, value) => {
        const newProperties = {
            ...selectedProperties,
            [name]: value
        };

        if (isValidCombination(newProperties)) {
            const matchingVariant = findMatchingVariant(newProperties);
            setSelectedProperties(newProperties);
            setSelectedVariant(matchingVariant);
        }
    };

    const handlers = useSwipeable({
        onSwipedLeft: () => changeImage(1),
        onSwipedRight: () => changeImage(-1),
        preventDefaultTouchmoveEvent: true,
        trackMouse: true
    });

    const changeImage = (direction) => {
        const currentIndex = product.images.indexOf(mainImage);
        const newIndex = (currentIndex + direction + product.images.length) % product.images.length;
        setMainImage(product.images[newIndex]);
    };

    const currentIndex = product.images.indexOf(mainImage) + 1;

    const shimmerEffect = {
        hidden: { x: '-100%' },
        visible: { x: '100%' },
    };

    const increaseQuantity = () => {
        if (selectedVariant && quantity < selectedVariant.stock) {
            setQuantity(prev => prev + 1);
        }
    };

    const decreaseQuantity = () => {
        setQuantity(prev => (prev > 1 ? prev - 1 : 1));
    };

    const handleAddToCart = () => {
        if (selectedVariant) {
            addToCart({
                productId: product._id,
                variantId: selectedVariant._id,
                properties: selectedProperties,
                quantity,
                price: selectedVariant.price
            });
            onClose();
        }
    };

    const averageRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
        : 0;

    const showRating = averageRating >= 3.5;

    const RatingStars = ({ rating, size = 'w-4 h-4' }) => {
        if (!showRating) return null;

        return (
            <div className="flex items-center justify-center mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`${size} ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
                    />
                ))}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-white p-2 mt-10 mb-10 rounded-lg max-w-xl w-3/5 sm:w-2/3 relative"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute -top-3 -right-3 rounded-full bg-black text-gray-200 hover:text-red-600">
                    <X />
                </button>

                <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/2">
                        <div {...handlers} className="relative w-full justify-center block">
                            {isLoading ? (
                                <div className="w-full h-[280px] sm:h-[300px] bg-gray-300 rounded-lg relative overflow-hidden">
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                                        initial="hidden"
                                        animate="visible"
                                        variants={shimmerEffect}
                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        style={{ width: '50%', opacity: 0.2 }}
                                    />
                                </div>
                            ) : (
                                <Image
                                    src={mainImage}
                                    width={500}
                                    height={400}
                                    alt="Main product image"
                                    className="rounded-lg shadow-xl object-cover w-64 sm:w-full sm:h-80 mx-auto"
                                />
                            )}

                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 pr-2 pl-2 rounded-3xl">
                                {product.images.length} / {currentIndex}
                            </div>
                        </div>

                        <div className="hidden sm:flex gap-2 overflow-auto mt-2">
                            {product.images.map((image, index) => (
                                <div key={index} className="relative w-20 h-20">
                                    {isLoading ? (
                                        <div className="w-20 h-20 bg-gray-300 rounded-lg relative overflow-hidden">
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                                                initial="hidden"
                                                animate="visible"
                                                variants={shimmerEffect}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                style={{ width: '50%', opacity: 0.2 }}
                                            />
                                        </div>
                                    ) : (
                                        <Image
                                            src={image}
                                            width={100}
                                            height={100}
                                            alt={`Thumbnail ${index}`}
                                            className={`w-20 h-20 rounded-lg object-cover cursor-pointer ${mainImage === image ? 'border-2 border-black' : ''}`}
                                            onClick={() => setMainImage(image)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full sm:w-1/2 mt-4 sm:mt-0 sm:pr-4">
                        <h2 className="text-xl text-center font-bold">{product.title}</h2>
                        <RatingStars rating={averageRating} />
                        <p className="text-lg text-center font-semibold">
                            {selectedVariant ? `${selectedVariant.price} ر.س` : 'اختر المواصفات'}
                        </p>

                        {product.variants[0]?.properties &&
                            Object.entries(product.variants[0].properties).map(([name, values]) => (
                                <div key={name} className="mb-4">
                                    <p className="text-base text-center font-semibold mb-2">{name}:</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {[...new Set(product.variants.flatMap(v => v.properties[name] || []))].map((value, idx) => {
                                            const wouldBeValid = isValidCombination({
                                                ...selectedProperties,
                                                [name]: value
                                            });

                                            return (
                                                <button
                                                    key={idx}
                                                    className={`${name === 'اللون'
                                                        ? 'w-8 h-8 rounded-full border border-black'
                                                        : 'py-1 px-3 rounded-lg border border-black'
                                                        } ${selectedProperties[name] === value
                                                            ? name === 'اللون'
                                                                ? 'ring-2 ring-offset-2 ring-black'
                                                                : 'bg-black text-white'
                                                            : 'text-black'
                                                        } ${!wouldBeValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    style={name === 'اللون' ? { backgroundColor: getColorHex(value) } : {}}
                                                    onClick={() => wouldBeValid && toggleProperty(name, value)}
                                                    disabled={!wouldBeValid}
                                                    title={value}
                                                >
                                                    {name !== 'اللون' && value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        }

                        <div className="flex items-center justify-center mt-6">
                            <MinusCircle
                                className="hover:text-red-700 cursor-pointer"
                                onClick={decreaseQuantity}
                            />
                            <span className="text-lg font-medium mx-3">{quantity}</span>
                            <PlusCircle
                                className="hover:text-red-700 cursor-pointer"
                                onClick={increaseQuantity}
                            />
                        </div>

                        <div className="flex justify-center w-full mt-4">
                            <button
                                onClick={handleAddToCart}
                                disabled={!selectedVariant || selectedVariant.stock < 1}
                                className={`font-medium text-xl text-white rounded-lg py-2 w-3/4 flex items-center justify-center ${!selectedVariant || selectedVariant.stock < 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'}`}
                            >
                                <span className="hidden sm:inline">
                                    {!selectedVariant ? 'اختر المواصفات' : selectedVariant.stock < 1 ? 'نفذت الكمية' : 'إضافة إلى السلة'}
                                </span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-6 h-6 icon-white sm:mr-3"
                                    viewBox="0 0 576 512"
                                >
                                    <path d="M0 24C0 10.7 10.7 0 24 0L69.5 0c22 0 41.5 12.8 50.6 32l411 0c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3l-288.5 0 5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5L488 336c13.3 0 24 10.7 24 24s-10.7 24-24 24l-288.3 0c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5L24 48C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96zM252 160c0 11 9 20 20 20l44 0 0 44c0 11 9 20 20 20s20-9 20-20l0-44 44 0c11 0 20-9 20-20s-9-20-20-20l-44 0 0-44c0-11-9-20-20-20s-20 9-20 20l0 44-44 0c-11 0-20 9-20 20z" />
                                </svg>
                            </button>
                        </div>

                        {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
                            <p className="text-red-600 text-center mt-2">
                                باقي {selectedVariant.stock} قطع فقط
                            </p>
                        )}

                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default QuickAddToCart;
