import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Paper, Box, Typography } from '@mui/material';
import { FabricItem } from '../App';

interface DraggableFabricItemProps {
    item: FabricItem;
}

export const DraggableFabricItem: React.FC<DraggableFabricItemProps> = ({ item }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: item.id,
        data: { item },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
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
                touchAction: 'none',
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