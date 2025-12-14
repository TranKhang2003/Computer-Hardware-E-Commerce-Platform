import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function ProductFilter({
    filters,
    onFilterChange,
    brands = [],
    categories = []
}) {
    const [open, setOpen] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 50000000]);

    const handleBrandChange = (brand) => {
        const newBrands = filters.brands?.includes(brand)
            ? filters.brands.filter(b => b !== brand)
            : [...(filters.brands || []), brand];

        onFilterChange({ ...filters, brands: newBrands });
    };

    const handleCategoryChange = (category) => {
        const newCategories = filters.categories?.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...(filters.categories || []), category];

        onFilterChange({ ...filters, categories: newCategories });
    };

    const handlePriceChange = (value) => {
        setPriceRange(value);
    };

    const applyPriceFilter = () => {
        onFilterChange({
            ...filters,
            minPrice: priceRange[0],
            maxPrice: priceRange[1]
        });
    };

    const clearFilters = () => {
        setPriceRange([0, 50000000]);
        onFilterChange({});
    };

    const activeFiltersCount =
        (filters.brands?.length || 0) +
        (filters.categories?.length || 0) +
        (filters.minPrice ? 1 : 0);

    const FilterContent = () => (
        <div className="space-y-6">
            {/* Categories */}
            <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-2">
                    {Array.isArray(categories) && categories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                                id={`category-${category}`}
                                checked={filters.categories?.includes(category)}
                                onCheckedChange={() => handleCategoryChange(category)}
                            />
                            <Label
                                htmlFor={`category-${category}`}
                                className="text-sm font-normal cursor-pointer"
                            >
                                {category}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Brands */}
            <div>
                <h3 className="font-semibold mb-3">Brands</h3>
                <div className="space-y-2">
                    {Array.isArray(brands) && brands.map((brand) => (
                        <div key={brand} className="flex items-center space-x-2">
                            <Checkbox
                                id={`brand-${brand}`}
                                checked={filters.brands?.includes(brand)}
                                onCheckedChange={() => handleBrandChange(brand)}
                            />
                            <Label
                                htmlFor={`brand-${brand}`}
                                className="text-sm font-normal cursor-pointer"
                            >
                                {brand}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <h3 className="font-semibold mb-3">Price Range</h3>
                <div className="space-y-4">
                    <Slider
                        min={0}
                        max={50000000}
                        step={500000}
                        value={priceRange}
                        onValueChange={handlePriceChange}
                        className="w-full"
                    />
                    <div className="flex items-center justify-between text-sm">
                        <span>{priceRange[0]} đ</span>
                        <span>{priceRange[1]} đ</span>
                    </div>
                    <Button
                        onClick={applyPriceFilter}
                        className="w-full"
                        size="sm"
                    >
                        Apply Price Filter
                    </Button>
                </div>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
                <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                >
                    Clear All Filters
                </Button>
            )}
        </div>
    );

    return (
        <>
            {/* Desktop Filter */}
            <div className="hidden lg:block w-64 space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Filters</h2>
                    {activeFiltersCount > 0 && (
                        <span className="text-sm text-muted-foreground">
                            ({activeFiltersCount} active)
                        </span>
                    )}
                </div>
                <FilterContent />
            </div>

            {/* Mobile Filter */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild className="lg:hidden">
                    <Button variant="outline" className="relative">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                        <FilterContent />
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
