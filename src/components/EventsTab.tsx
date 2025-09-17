/**
 * Events Tab Component for NGO Dashboard
 * 
 * Provides comprehensive event management including CRUD operations,
 * bulk operations, and event duplication functionality.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Copy,
    Calendar,
    MapPin,
    Users,
    CheckSquare,
    Square,
    Eye,
    EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EventForm } from './EventForm';

import { LoadingWrapper, ListSkeleton } from './LoadingSkeleton';
import { useErrorHandler } from '../hooks/useErrorHandler';
import toast from 'react-hot-toast';

interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    slots_available: number;
    image_url?: string;
    ngo_id: string;
    status?: 'draft' | 'published' | 'cancelled' | 'completed';
    created_at?: string;
    updated_at?: string;
}

interface EventsTabProps {
    ngoProfile: any;
    events: Event[];
    onEventsUpdate: () => void;
}

interface BulkOperationState {
    selectedEvents: Set<string>;
    isPerformingBulk: boolean;
    operation: string | null;
}

export function EventsTab({ ngoProfile, events, onEventsUpdate }: EventsTabProps) {
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'created'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [bulkState, setBulkState] = useState<BulkOperationState>({
        selectedEvents: new Set(),
        isPerformingBulk: false,
        operation: null,
    });

    const { withErrorHandling } = useErrorHandler({
        component: 'EventsTab',
        enableAutoRecovery: true,
    });

    // Filter and sort events
    const filteredAndSortedEvents = useMemo(() => {
        const filtered = events.filter(event => {
            const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.location.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || event.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // Sort events
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'created':
                    comparison = new Date(a.created_at || a.date).getTime() - new Date(b.created_at || b.date).getTime();
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [events, searchTerm, statusFilter, sortBy, sortOrder]);

    // Bulk selection handlers
    const handleSelectAll = useCallback(() => {
        if (bulkState.selectedEvents.size === filteredAndSortedEvents.length) {
            setBulkState(prev => ({ ...prev, selectedEvents: new Set() }));
        } else {
            setBulkState(prev => ({
                ...prev,
                selectedEvents: new Set(filteredAndSortedEvents.map(e => e.id))
            }));
        }
    }, [filteredAndSortedEvents, bulkState.selectedEvents.size]);

    const handleSelectEvent = useCallback((eventId: string) => {
        setBulkState(prev => {
            const newSelected = new Set(prev.selectedEvents);
            if (newSelected.has(eventId)) {
                newSelected.delete(eventId);
            } else {
                newSelected.add(eventId);
            }
            return { ...prev, selectedEvents: newSelected };
        });
    }, []);

    // Event operations
    const handleCreateEvent = () => {
        setEditingEvent(null);
        setShowEventForm(true);
    };

    const handleEditEvent = (event: Event) => {
        setEditingEvent(event);
        setShowEventForm(true);
    };

    const handleDuplicateEvent = withErrorHandling(async (event: Event) => {
        const duplicatedEvent = {
            ...event,
            title: `${event.title} (Copy)`,
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
            status: 'draft',
        };

        delete duplicatedEvent.id;
        delete duplicatedEvent.created_at;
        delete duplicatedEvent.updated_at;

        const { error } = await supabase
            .from('events')
            .insert([duplicatedEvent]);

        if (error) throw error;

        toast.success('Event duplicated successfully');
        onEventsUpdate();
    }, 'handleDuplicateEvent');

    const handleDeleteEvent = withErrorHandling(async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;

        toast.success('Event deleted successfully');
        onEventsUpdate();
    }, 'handleDeleteEvent');



    // Bulk operations
    const handleBulkDelete = withErrorHandling(async () => {
        if (bulkState.selectedEvents.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${bulkState.selectedEvents.size} events?`)) return;

        setBulkState(prev => ({ ...prev, isPerformingBulk: true, operation: 'delete' }));

        const { error } = await supabase
            .from('events')
            .delete()
            .in('id', Array.from(bulkState.selectedEvents));

        if (error) throw error;

        toast.success(`${bulkState.selectedEvents.size} events deleted successfully`);
        setBulkState(prev => ({ ...prev, selectedEvents: new Set(), isPerformingBulk: false, operation: null }));
        onEventsUpdate();
    }, 'handleBulkDelete');

    const handleBulkStatusUpdate = withErrorHandling(async (status: string) => {
        if (bulkState.selectedEvents.size === 0) return;

        setBulkState(prev => ({ ...prev, isPerformingBulk: true, operation: 'status' }));

        const { error } = await supabase
            .from('events')
            .update({ status, updated_at: new Date().toISOString() })
            .in('id', Array.from(bulkState.selectedEvents));

        if (error) throw error;

        toast.success(`${bulkState.selectedEvents.size} events updated to ${status}`);
        setBulkState(prev => ({ ...prev, selectedEvents: new Set(), isPerformingBulk: false, operation: null }));
        onEventsUpdate();
    }, 'handleBulkStatusUpdate');

    const handleEventFormSuccess = () => {
        setShowEventForm(false);
        setEditingEvent(null);
        onEventsUpdate();
    };

    if (showEventForm) {
        return (
            <EventForm
                mode={editingEvent ? 'edit' : 'create'}
                existingEvent={editingEvent}
                ngoId={ngoProfile?.id}
                userId={ngoProfile?.user_id}
                onSuccess={handleEventFormSuccess}
                onCancel={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Event Management</h3>
                    <p className="text-sm text-gray-600">
                        Manage your volunteer events and opportunities
                    </p>
                </div>

                <button
                    onClick={handleCreateEvent}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                </button>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-');
                                setSortBy(field as 'date' | 'title' | 'created');
                                setSortOrder(order as 'asc' | 'desc');
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="date-desc">Date (Newest)</option>
                            <option value="date-asc">Date (Oldest)</option>
                            <option value="title-asc">Title (A-Z)</option>
                            <option value="title-desc">Title (Z-A)</option>
                            <option value="created-desc">Created (Newest)</option>
                            <option value="created-asc">Created (Oldest)</option>
                        </select>
                    </div>
                </div>

                {/* Bulk Operations */}
                {bulkState.selectedEvents.size > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-900">
                                {bulkState.selectedEvents.size} event(s) selected
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleBulkStatusUpdate('published')}
                                    disabled={bulkState.isPerformingBulk}
                                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    <Eye className="h-3 w-3 mr-1 inline" />
                                    Publish
                                </button>

                                <button
                                    onClick={() => handleBulkStatusUpdate('draft')}
                                    disabled={bulkState.isPerformingBulk}
                                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                                >
                                    <EyeOff className="h-3 w-3 mr-1 inline" />
                                    Draft
                                </button>

                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkState.isPerformingBulk}
                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                    <Trash2 className="h-3 w-3 mr-1 inline" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Events List */}
            <div className="space-y-4">
                {/* Select All */}
                {filteredAndSortedEvents.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-md">
                        <button
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            {bulkState.selectedEvents.size === filteredAndSortedEvents.length ? (
                                <CheckSquare className="h-4 w-4" />
                            ) : (
                                <Square className="h-4 w-4" />
                            )}
                            Select All ({filteredAndSortedEvents.length})
                        </button>
                    </div>
                )}

                {/* Events */}
                <LoadingWrapper
                    isLoading={false}
                    skeleton={<ListSkeleton items={3} showImage={true} />}
                >
                    {filteredAndSortedEvents.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                            <p className="text-gray-600 mb-4">
                                {searchTerm || statusFilter !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Create your first event to get started'
                                }
                            </p>
                            {!searchTerm && statusFilter === 'all' && (
                                <button
                                    onClick={handleCreateEvent}
                                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Your First Event
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredAndSortedEvents.map((event) => (
                                <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Selection Checkbox */}
                                        <button
                                            onClick={() => handleSelectEvent(event.id)}
                                            className="mt-1 flex-shrink-0"
                                        >
                                            {bulkState.selectedEvents.has(event.id) ? (
                                                <CheckSquare className="h-5 w-5 text-primary" />
                                            ) : (
                                                <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                            )}
                                        </button>

                                        {/* Event Image */}
                                        {event.image_url && (
                                            <div className="flex-shrink-0">
                                                <img
                                                    src={event.image_url}
                                                    alt={event.title}
                                                    className="w-16 h-16 object-cover rounded-md"
                                                />
                                            </div>
                                        )}

                                        {/* Event Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-semibold text-gray-900 truncate">
                                                        {event.title}
                                                    </h4>

                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-4 w-4" />
                                                            {new Date(event.date).toLocaleDateString()}
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-4 w-4" />
                                                            {event.location}
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-4 w-4" />
                                                            {event.slots_available} slots
                                                        </div>
                                                    </div>

                                                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                                        {event.description}
                                                    </p>

                                                    {/* Status Badge */}
                                                    <div className="mt-2">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${event.status === 'published' ? 'bg-green-100 text-green-800' :
                                                            event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                                event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                    event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {event.status || 'draft'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Actions Menu */}
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button
                                                        onClick={() => handleEditEvent(event)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Edit event"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDuplicateEvent(event)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Duplicate event"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteEvent(event.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Delete event"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </LoadingWrapper>
            </div>
        </div>
    );
}