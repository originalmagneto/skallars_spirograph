import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Add01Icon, Delete01Icon, PencilEdit01Icon, Cancel01Icon, Tick01Icon, Location01Icon, Search01Icon } from 'hugeicons-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MapSettingsPanel from './MapSettingsPanel';

interface MapCity {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    is_main: boolean;
    is_secondary: boolean;
    region: string;
    display_order: number;
}

const emptyCity: Omit<MapCity, 'id'> = {
    name: '',
    latitude: 0,
    longitude: 0,
    is_main: false,
    is_secondary: false,
    region: 'europe',
    display_order: 0,
};

const MapCitiesManager = () => {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<MapCity, 'id'>>(emptyCity);
    const [isAdding, setIsAdding] = useState(false);
    const [newCity, setNewCity] = useState<Omit<MapCity, 'id'>>(emptyCity);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: cities, isLoading } = useQuery({
        queryKey: ['map-cities'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('map_cities')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data as MapCity[];
        },
    });

    // Filter cities based on search query
    const filteredCities = cities?.filter((city) =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.region.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const createMutation = useMutation({
        mutationFn: async (city: Omit<MapCity, 'id'>) => {
            const { error } = await supabase.from('map_cities').insert(city);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('City added');
            queryClient.invalidateQueries({ queryKey: ['map-cities'] });
            setIsAdding(false);
            setNewCity(emptyCity);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...city }: MapCity) => {
            const { error } = await supabase.from('map_cities').update(city).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('City updated');
            queryClient.invalidateQueries({ queryKey: ['map-cities'] });
            setEditingId(null);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('map_cities').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('City deleted');
            queryClient.invalidateQueries({ queryKey: ['map-cities'] });
            setDeleteId(null);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const startEdit = (city: MapCity) => {
        setEditingId(city.id);
        setEditForm({
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude,
            is_main: city.is_main,
            is_secondary: city.is_secondary,
            region: city.region,
            display_order: city.display_order,
        });
    };

    // Geocoding function using OpenStreetMap Nominatim (free, no API key required)
    const geocodeCity = async (cityName: string): Promise<{ lat: number; lng: number; displayName: string } | null> => {
        if (!cityName.trim()) return null;
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`,
                { headers: { 'User-Agent': 'SkallarsAdmin/1.0' } }
            );
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    displayName: data[0].display_name,
                };
            }
        } catch (err) {
            console.error('Geocoding error:', err);
        }
        return null;
    };

    const CityForm = ({
        values,
        onChange,
        onSave,
        onCancel,
        isNew = false,
    }: {
        values: Omit<MapCity, 'id'>;
        onChange: (values: Omit<MapCity, 'id'>) => void;
        onSave: () => void;
        onCancel: () => void;
        isNew?: boolean;
    }) => {
        const [searchQuery, setSearchQuery] = useState('');
        const [isSearching, setIsSearching] = useState(false);
        const [searchResult, setSearchResult] = useState<string | null>(null);

        const handleSearch = async () => {
            if (!searchQuery.trim()) return;
            setIsSearching(true);
            setSearchResult(null);

            const result = await geocodeCity(searchQuery);

            if (result) {
                onChange({
                    ...values,
                    name: searchQuery,
                    latitude: result.lat,
                    longitude: result.lng,
                });
                setSearchResult(`✓ Found: ${result.displayName.split(',').slice(0, 2).join(',')}`);
            } else {
                setSearchResult('✗ City not found. Try a different name.');
            }
            setIsSearching(false);
        };

        return (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                {/* City Search Row */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Label className="text-xs font-medium">Search City (Auto-fills coordinates)</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Type city name, e.g. 'Tokyo' or 'New York'"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                            >
                                <Search01Icon size={14} className="mr-1" />
                                {isSearching ? 'Searching...' : 'Find'}
                            </Button>
                        </div>
                        {searchResult && (
                            <p className={`text-xs mt-1 ${searchResult.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                                {searchResult}
                            </p>
                        )}
                    </div>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                        <Label className="text-xs">City Name</Label>
                        <Input
                            value={values.name}
                            onChange={(e) => onChange({ ...values, name: e.target.value })}
                            placeholder="City name"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Latitude</Label>
                        <Input
                            type="number"
                            step="0.0001"
                            value={values.latitude}
                            onChange={(e) => onChange({ ...values, latitude: parseFloat(e.target.value) || 0 })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Longitude</Label>
                        <Input
                            type="number"
                            step="0.0001"
                            value={values.longitude}
                            onChange={(e) => onChange({ ...values, longitude: parseFloat(e.target.value) || 0 })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Region</Label>
                        <Select value={values.region} onValueChange={(v) => onChange({ ...values, region: v })}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="europe">Europe</SelectItem>
                                <SelectItem value="asia">Asia</SelectItem>
                                <SelectItem value="americas">Americas</SelectItem>
                                <SelectItem value="africa">Africa</SelectItem>
                                <SelectItem value="oceania">Oceania</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={values.is_main}
                                onCheckedChange={(v) => onChange({ ...values, is_main: v, is_secondary: v ? false : values.is_secondary })}
                            />
                            <Label className="text-xs">Main Hub</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={values.is_secondary}
                                onCheckedChange={(v) => onChange({ ...values, is_secondary: v, is_main: v ? false : values.is_main })}
                            />
                            <Label className="text-xs">Secondary</Label>
                        </div>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" onClick={onSave}>
                        <Tick01Icon size={14} className="mr-1" />
                        {isNew ? 'Add City' : 'Save Changes'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancel}>
                        <Cancel01Icon size={14} className="mr-1" />
                        Cancel
                    </Button>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="p-4 text-gray-500">Loading cities...</div>;

    return (
        <div className="space-y-6">
            {/* Map Display Settings */}
            <MapSettingsPanel />

            {/* Cities List */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Location01Icon size={20} className="text-[var(--indigo-900)]" />
                    <h2 className="text-lg font-semibold">Map Cities</h2>
                    <Badge variant="secondary">{filteredCities?.length || 0}{searchQuery && cities ? ` / ${cities.length}` : ''}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search01Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <Input
                            placeholder="Search cities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 w-48"
                        />
                    </div>
                    {!isAdding && (
                        <Button size="sm" onClick={() => setIsAdding(true)}>
                            <Add01Icon size={14} className="mr-1" />
                            Add City
                        </Button>
                    )}
                </div>
            </div>

            {isAdding && (
                <CityForm
                    values={newCity}
                    onChange={setNewCity}
                    onSave={() => createMutation.mutate(newCity)}
                    onCancel={() => {
                        setIsAdding(false);
                        setNewCity(emptyCity);
                    }}
                    isNew
                />
            )}

            <div className="space-y-2">
                {filteredCities?.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-gray-500">
                        No cities found matching "{searchQuery}"
                    </div>
                )}
                {filteredCities?.map((city) =>
                    editingId === city.id ? (
                        <CityForm
                            key={city.id}
                            values={editForm}
                            onChange={setEditForm}
                            onSave={() => updateMutation.mutate({ id: city.id, ...editForm })}
                            onCancel={() => setEditingId(null)}
                        />
                    ) : (
                        <div
                            key={city.id}
                            className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:border-[var(--indigo-900)]/30 transition-colors shadow-sm"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{city.name}</span>
                                    {city.is_main && <Badge>Main Hub</Badge>}
                                    {city.is_secondary && <Badge variant="secondary">Secondary</Badge>}
                                    <Badge variant="outline" className="capitalize">
                                        {city.region}
                                    </Badge>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Lat: {city.latitude.toFixed(4)}, Lng: {city.longitude.toFixed(4)}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => startEdit(city)}>
                                    <PencilEdit01Icon size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteId(city.id)}
                                >
                                    <Delete01Icon size={14} />
                                </Button>
                            </div>
                        </div>
                    )
                )}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete City</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this city from the map? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MapCitiesManager;
