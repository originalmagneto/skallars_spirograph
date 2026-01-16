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
    country?: string;
    latitude: number;
    longitude: number;
    is_main: boolean;
    is_secondary: boolean;
    region: string;
    display_order: number;
}

const emptyCity: Omit<MapCity, 'id'> = {
    name: '',
    country: '',
    latitude: 0,
    longitude: 0,
    is_main: false,
    is_secondary: false,
    region: 'europe',
    display_order: 0,
};

// Extracted CityForm component to prevent re-renders losing focus
const CityForm = ({ values, onChange, onSave, onCancel, isNew }: any) => {
    const [searching, setSearching] = useState(false);

    const matchCoordinates = async () => {
        if (!values.name) {
            toast.error('Please enter a city name first');
            return;
        }

        setSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(values.name)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                onChange({
                    ...values,
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon),
                    country: values.country || result.display_name.split(',').pop()?.trim() || ''
                });
                toast.success(`Found coordinates for ${values.name}`);
            } else {
                toast.error('City not found');
            }
        } catch (error) {
            toast.error('Failed to fetch coordinates');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="bg-muted/30 p-4 rounded-lg border mb-2">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                    <Label className="text-xs">City Name</Label>
                    <div className="flex gap-2">
                        <Input
                            value={values.name}
                            onChange={(e) => onChange({ ...values, name: e.target.value })}
                            placeholder="City name"
                            className="mt-1"
                        />
                        <Button
                            variant="secondary"
                            size="icon"
                            className="mt-1 shrink-0"
                            onClick={matchCoordinates}
                            disabled={searching}
                            title="Find Coordinates"
                        >
                            {searching ? <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /> : <Search01Icon size={14} />}
                        </Button>
                    </div>
                </div>
                <div className="md:col-span-1">
                    <Label className="text-xs">Country</Label>
                    <Input
                        value={values.country || ''}
                        onChange={(e) => onChange({ ...values, country: e.target.value })}
                        placeholder="e.g. Slovakia"
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
        </div >
    );
};

const MapCitiesManager = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newCity, setNewCity] = useState<Omit<MapCity, 'id'>>(emptyCity);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<MapCity, 'id'>>(emptyCity);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: cities, isLoading } = useQuery({
        queryKey: ['map_cities'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('map_cities')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as MapCity[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: Omit<MapCity, 'id'>) => {
            const { error } = await supabase.from('map_cities').insert(data);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['map_cities'] });
            queryClient.invalidateQueries({ queryKey: ['map-cities-public'] });
            setIsAdding(false);
            setNewCity(emptyCity);
            toast.success('City added');
        },
        onError: (e) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const { id, ...updates } = data;
            const { error } = await supabase
                .from('map_cities')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['map_cities'] });
            queryClient.invalidateQueries({ queryKey: ['map-cities-public'] });
            setEditingId(null);
            toast.success('City updated');
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('map_cities').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['map_cities'] });
            queryClient.invalidateQueries({ queryKey: ['map-cities-public'] });
            setDeleteId(null);
            toast.success('City deleted');
        },
        onError: (e) => toast.error(e.message),
    });

    const filteredCities = cities?.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const startEdit = (city: MapCity) => {
        setEditingId(city.id);
        setEditForm({
            name: city.name,
            country: city.country || '',
            latitude: city.latitude,
            longitude: city.longitude,
            is_main: city.is_main,
            is_secondary: city.is_secondary,
            region: city.region,
            display_order: city.display_order,
        });
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
