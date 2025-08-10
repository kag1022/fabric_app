import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paper, Box, Typography } from '@mui/material';
import { FabricItem } from '../App';

interface SortableFabricItemProps {
    item: FabricItem;
}

export const SortableFabricItem: React.FC<SortableFabricItemProps> = ({ item }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as 'relative',
    };

    return (
        <Paper
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            elevation={3}
            sx={{
                width: 120,
                height: 120,
                overflow: 'hidden',
                cursor: 'grab',
                touchAction: 'none', // for mobile
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${item.imageDataUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'flex-end',
                    p: 1,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        px: 0.5,
                        borderRadius: 1,
                    }}
                >
                    {item.group}
                </Typography>
            </Box>
        </Paper>
    );
};