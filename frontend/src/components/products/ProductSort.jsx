import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function ProductSort({ value, onChange }) {
    const sortOptions = [
        { value: 'relevance', label: 'Relevance' },
        { value: 'name-asc', label: 'Name (A-Z)' },
        { value: 'name-desc', label: 'Name (Z-A)' },
        { value: 'price-asc', label: 'Price (Low to High)' },
        { value: 'price-desc', label: 'Price (High to Low)' },
        { value: 'rating', label: 'Top Rated' },
    ];

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">Sort by:</span>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
