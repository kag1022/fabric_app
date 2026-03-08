import { Box, Typography } from '@mui/material';

const STEPS = [
  { number: '1', label: 'とる' },
  { number: '2', label: 'たしかめる' },
  { number: '3', label: 'しまう' },
];

interface StepProgressProps {
  activeStep: 0 | 1 | 2;
}

function StepProgress({ activeStep }: StepProgressProps) {
  return (
    <Box
      aria-label={`現在の手順は ${activeStep + 1} / ${STEPS.length}`}
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(3, minmax(0, 1fr))',
        },
        width: '100%',
      }}
    >
      {STEPS.map((step, index) => {
        const isActive = index === activeStep;

        return (
          <Box
            key={step.number}
            sx={{
              alignItems: 'center',
              backgroundColor: isActive ? 'primary.main' : 'rgba(255, 255, 255, 0.72)',
              border: '2px solid',
              borderColor: isActive ? 'primary.dark' : 'rgba(46, 62, 72, 0.16)',
              borderRadius: 3,
              color: isActive ? 'primary.contrastText' : 'text.primary',
              display: 'flex',
              gap: 1.5,
              minHeight: 76,
              px: 2,
              py: 1.5,
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : 'background.default',
                borderRadius: '50%',
                display: 'flex',
                fontSize: '1.25rem',
                fontWeight: 800,
                height: 40,
                justifyContent: 'center',
                minWidth: 40,
              }}
            >
              {step.number}
            </Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>
              {step.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default StepProgress;
