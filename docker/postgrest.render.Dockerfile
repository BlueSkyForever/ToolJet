# Render deployments doesn't support image based deploys yet
# Thus making use of placeholder dockerfile to be used in render.yaml
# ref:
# https://github.com/PostgREST/postgrest/tree/main/nix/tools/docker
# https://feedback.render.com/features/p/deploy-docker-images-from-public-private-registries

FROM alpine:latest

# copy PostgREST over
COPY --from=postgrest/postgrest:10.0.0 /bin/postgrest /bin

EXPOSE 3000

USER 1000

CMD [ "/bin/postgrest" ]
