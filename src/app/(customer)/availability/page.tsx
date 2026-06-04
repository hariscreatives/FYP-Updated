'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataContext';
import { Users, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

function AvailabilityContent() {
    const searchParams = useSearchParams();
    const category = searchParams.get('category');
    const { rooms } = useData();
    const availableRooms = rooms.filter(room => room.available);

    const categories = [
        {
            name: 'Single',
            image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500',
            description: 'Perfect for solo travelers with essential amenities.',
            price: 5000
        },
        {
            name: 'Double',
            image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500',
            description: 'Comfortable room for two with city views.',
            price: 10000
        },
        {
            name: 'Suite',
            image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500',
            description: 'Spacious suite with living area and premium features.',
            price: 20000
        },
        {
            name: 'Presidential',
            image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=500',
            description: 'Ultimate luxury with panoramic views and private pool.',
            price: 50000
        }
    ];

    if (!category) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Room Categories</h1>
                    <p className="text-gray-600">Select a category to view available rooms</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((cat) => (
                        <Card key={cat.name} className="overflow-hidden hover:shadow-xl transition-shadow flex flex-col">
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={cat.image}
                                    alt={`${cat.name} room`}
                                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                />
                            </div>
                            <CardHeader>
                                <CardTitle>{cat.name} Rooms</CardTitle>
                                <div className="text-lg font-bold text-primary mt-2">
                                    PKR {cat.price.toLocaleString()} <span className="text-sm font-normal text-gray-500">per night</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-gray-600">{cat.description}</p>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/availability?category=${cat.name}`} className="w-full">
                                    <Button className="w-full">View Rooms</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const filteredRooms = availableRooms.filter(r => r.type.toLowerCase() === category.toLowerCase());

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Link href="/availability" className="inline-flex items-center text-primary hover:underline mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Categories
                </Link>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{category} Rooms</h1>
                <p className="text-gray-600">Choose from our selection of {category.toLowerCase()} rooms</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                    <Card key={room.id} className="overflow-hidden hover:shadow-xl transition-shadow flex flex-col">
                        <div className="relative h-48 overflow-hidden">
                            <img
                                src={room.imageUrl}
                                alt={`${room.type} room`}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                            />
                            <Badge className="absolute top-3 right-3 bg-green-500">
                                Available
                            </Badge>
                        </div>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{room.type} Room</CardTitle>
                                    <p className="text-sm text-gray-500">Room #{room.number}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-primary">PKR {room.price.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">per night</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-gray-600 mb-4">{room.description}</p>

                            <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-1" />
                                    <span>{room.capacity} Guest{room.capacity > 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-700">Amenities:</p>
                                <div className="flex flex-wrap gap-2">
                                    {room.amenities.slice(0, 4).map((amenity, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                            {amenity}
                                        </Badge>
                                    ))}
                                    {room.amenities.length > 4 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{room.amenities.length - 4} more
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/booking?roomId=${room.id}`} className="w-full">
                                <Button className="w-full">Book Now</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {filteredRooms.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-xl text-gray-600">No {category} rooms currently available</p>
                    <p className="text-gray-500 mt-2">Please select another category or check back later</p>
                </div>
            )}
        </div>
    );
}

export default function Availability() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[40vh] items-center justify-center font-sans">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        }>
            <AvailabilityContent />
        </Suspense>
    );
}
